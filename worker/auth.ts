import type {
  AuthProvider,
  AuthProviders,
  AuthUser
} from "../src/types";

export interface AuthEnv {
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  AUTH_BASE_URL?: string;
}

interface IdentityUserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
}

interface OAuthState {
  state: string;
  provider: AuthProvider;
  next: string;
  redirectUri: string;
  verifier?: string;
  mobile?: boolean;
  mobileChallenge?: string;
}

interface ProviderProfile {
  accountId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string;
}

const SESSION_COOKIE = "aatrip_session";
const OAUTH_COOKIE = "aatrip_oauth";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const OAUTH_TTL_SECONDS = 10 * 60;
const MOBILE_HANDOFF_TTL_SECONDS = 5 * 60;
const MOBILE_CALLBACK = "aatrip://auth/callback";

export class AuthFlowError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthFlowError";
    this.code = code;
  }
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomToken(byteLength = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function sha256(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  );
}

async function hashSessionToken(token: string) {
  const digest = await sha256(token);
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

function encodeState(state: OAuthState) {
  return base64Url(new TextEncoder().encode(JSON.stringify(state)));
}

function decodeState(value: string): OAuthState | null {
  try {
    const decoded = new TextDecoder().decode(fromBase64Url(value));
    const parsed = JSON.parse(decoded) as Partial<OAuthState>;
    if (
      typeof parsed.state !== "string" ||
      (parsed.provider !== "google" && parsed.provider !== "github") ||
      typeof parsed.next !== "string" ||
      typeof parsed.redirectUri !== "string"
    ) {
      return null;
    }
    return {
      state: parsed.state,
      provider: parsed.provider,
      next: parsed.next,
      redirectUri: parsed.redirectUri,
      verifier: typeof parsed.verifier === "string" ? parsed.verifier : "",
      mobile: parsed.mobile === true,
      mobileChallenge:
        typeof parsed.mobileChallenge === "string"
          ? parsed.mobileChallenge
          : ""
    };
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return "";
}

function cookie(name: string, value: string, request: Request, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function clearCookie(name: string, request: Request) {
  return cookie(name, "", request, 0);
}

function readBearer(request: Request) {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? "";
}

function mobileRedirect(params: Record<string, string>) {
  const url = new URL(MOBILE_CALLBACK);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function authFailureRedirect(
  baseUrl: string,
  stored: OAuthState | null,
  code: string,
  cookies: string[]
) {
  const target = stored?.mobile
    ? mobileRedirect({ error: code })
    : `${baseUrl}/?auth_error=${encodeURIComponent(code)}`;
  return redirect(target, cookies);
}

function redirect(location: string, cookies: string[] = []) {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer"
  });
  for (const value of cookies) headers.append("Set-Cookie", value);
  return new Response(null, { status: 302, headers });
}

function appBaseUrl(request: Request, env: AuthEnv) {
  const configured = env.AUTH_BASE_URL?.trim();
  return configured
    ? configured.replace(/\/+$/, "")
    : new URL(request.url).origin;
}

function providerCredentials(env: AuthEnv, provider: AuthProvider) {
  const clientId =
    provider === "google"
      ? env.GOOGLE_CLIENT_ID?.trim()
      : env.GITHUB_CLIENT_ID?.trim();
  const clientSecret =
    provider === "google"
      ? env.GOOGLE_CLIENT_SECRET?.trim()
      : env.GITHUB_CLIENT_SECRET?.trim();
  return clientId && clientSecret
    ? { clientId, clientSecret }
    : null;
}

export function configuredProviders(env: AuthEnv): AuthProviders {
  return {
    google: Boolean(providerCredentials(env, "google")),
    github: Boolean(providerCredentials(env, "github"))
  };
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/#/trips";
  }
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return "/#/trips";
  }
  return value.slice(0, 300);
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanName(value: unknown, fallback: string) {
  const name = typeof value === "string" ? value.trim() : "";
  return (name || fallback).slice(0, 80);
}

function cleanAvatar(value: unknown) {
  return typeof value === "string" && /^https:\/\//i.test(value)
    ? value.slice(0, 500)
    : "";
}

function isProvider(value: string): value is AuthProvider {
  return value === "google" || value === "github";
}

export async function startOAuth(
  request: Request,
  env: AuthEnv,
  provider: AuthProvider
) {
  const baseUrl = appBaseUrl(request, env);
  const url = new URL(request.url);
  const mobile = url.searchParams.get("client") === "ios";
  const credentials = providerCredentials(env, provider);
  if (!credentials) {
    return redirect(
      mobile
        ? mobileRedirect({ error: "auth_not_configured" })
        : `${baseUrl}/?auth_error=auth_not_configured`
    );
  }

  const redirectUri = `${baseUrl}/api/auth/${provider}/callback`;
  const state = randomToken(24);
  const mobileChallenge =
    url.searchParams.get("code_challenge")?.trim() ?? "";

  if (mobile && !/^[A-Za-z0-9_-]{43,128}$/.test(mobileChallenge)) {
    return redirect(mobileRedirect({ error: "invalid_code_challenge" }));
  }

  let verifier = "";
  let challenge = "";

  if (provider === "google") {
    verifier = randomToken(48);
    challenge = base64Url(await sha256(verifier));
  }

  const payload: OAuthState = {
    state,
    provider,
    next: safeNext(url.searchParams.get("next")),
    redirectUri,
    verifier,
    mobile,
    mobileChallenge: mobile ? mobileChallenge : ""
  };
  const authorizeUrl =
    provider === "google"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL("https://github.com/login/oauth/authorize");

  authorizeUrl.searchParams.set("client_id", credentials.clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set(
    "scope",
    provider === "google" ? "openid email profile" : "read:user user:email"
  );
  if (provider === "google") {
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
  }

  return redirect(authorizeUrl.toString(), [
    cookie(
      OAUTH_COOKIE,
      encodeState(payload),
      request,
      OAUTH_TTL_SECONDS
    )
  ]);
}

async function exchangeCode(
  env: AuthEnv,
  provider: AuthProvider,
  code: string,
  state: OAuthState
) {
  const credentials = providerCredentials(env, provider);
  if (!credentials) {
    throw new AuthFlowError("auth_not_configured", "Provider is not configured");
  }

  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    code,
    redirect_uri: state.redirectUri,
    grant_type: "authorization_code"
  });
  if (provider === "google" && state.verifier) {
    body.set("code_verifier", state.verifier);
  }

  const response = await fetch(
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "AATrip"
      },
      body
    }
  );
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new AuthFlowError(
      "oauth_exchange_failed",
      data.error_description || data.error || "Token exchange failed"
    );
  }
  return data.access_token;
}

async function googleProfile(accessToken: string): Promise<ProviderProfile> {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    }
  );
  if (!response.ok) {
    throw new AuthFlowError("oauth_profile_failed", "Could not load profile");
  }
  const data = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!data.sub) {
    throw new AuthFlowError("oauth_profile_failed", "Missing account id");
  }
  const email = normalizeEmail(data.email);
  return {
    accountId: data.sub,
    name: cleanName(data.name, email.split("@")[0] || "Traveler"),
    email: data.email_verified ? email : "",
    emailVerified: Boolean(data.email_verified),
    avatarUrl: cleanAvatar(data.picture)
  };
}

async function githubProfile(accessToken: string): Promise<ProviderProfile> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "AATrip",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const response = await fetch("https://api.github.com/user", { headers });
  if (!response.ok) {
    throw new AuthFlowError("oauth_profile_failed", "Could not load profile");
  }
  const data = (await response.json()) as {
    id?: number;
    login?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  if (!data.id) {
    throw new AuthFlowError("oauth_profile_failed", "Missing account id");
  }

  let email = "";
  let emailVerified = false;
  try {
    const emailResponse = await fetch("https://api.github.com/user/emails", {
      headers
    });
    if (emailResponse.ok) {
      const emails = (await emailResponse.json()) as Array<{
        email?: string;
        primary?: boolean;
        verified?: boolean;
      }>;
      const chosen =
        emails.find((entry) => entry.primary && entry.verified) ??
        emails.find((entry) => entry.verified);
      if (chosen?.email) {
        email = normalizeEmail(chosen.email);
        emailVerified = true;
      }
    }
  } catch {
    // A private email is fine; the account can still be identified by id.
  }

  return {
    accountId: String(data.id),
    name: cleanName(data.name, data.login || "Traveler"),
    email,
    emailVerified,
    avatarUrl: cleanAvatar(data.avatar_url)
  };
}

async function upsertUser(
  db: D1Database,
  provider: AuthProvider,
  profile: ProviderProfile
) {
  const now = new Date().toISOString();
  const existing = await db
    .prepare(
      `SELECT u.id
       FROM user_identities i
       JOIN users u ON u.id = i.user_id
       WHERE i.provider = ? AND i.provider_account_id = ?`
    )
    .bind(provider, profile.accountId)
    .first<{ id: string }>();

  let userId = existing?.id ?? "";

  if (!userId && profile.email && profile.emailVerified) {
    const byEmail = await db
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(profile.email)
      .first<{ id: string }>();
    userId = byEmail?.id ?? "";
  }

  if (!userId) {
    userId = crypto.randomUUID();
    try {
      await db
        .prepare(
          `INSERT INTO users
           (id, email, name, avatar_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          userId,
          profile.email,
          profile.name,
          profile.avatarUrl,
          now,
          now
        )
        .run();
    } catch (cause) {
      // A parallel login may have created the same email account first.
      if (!profile.email) throw cause;
      const byEmail = await db
        .prepare("SELECT id FROM users WHERE email = ?")
        .bind(profile.email)
        .first<{ id: string }>();
      if (!byEmail) throw cause;
      userId = byEmail.id;
    }
  }

  await db.batch([
    db
      .prepare(
        `UPDATE users SET
           name = ?,
           avatar_url = CASE WHEN ? <> '' THEN ? ELSE avatar_url END,
           email = CASE WHEN ? <> '' THEN ? ELSE email END,
           updated_at = ?
         WHERE id = ?`
      )
      .bind(
        profile.name,
        profile.avatarUrl,
        profile.avatarUrl,
        profile.email,
        profile.email,
        now,
        userId
      ),
    db
      .prepare(
        `INSERT INTO user_identities
         (provider, provider_account_id, user_id, email, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(provider, provider_account_id) DO UPDATE SET
           user_id = excluded.user_id,
           email = excluded.email`
      )
      .bind(provider, profile.accountId, userId, profile.email, now)
  ]);

  return userId;
}

async function createSession(env: AuthEnv, userId: string) {
  const token = randomToken(32);
  const tokenHash = await hashSessionToken(token);
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_SECONDS * 1000
  ).toISOString();

  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    env.DB
      .prepare(
        `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(tokenHash, userId, now, expiresAt)
  ]);

  return { token, expiresAt };
}

export async function finishOAuth(
  request: Request,
  env: AuthEnv,
  provider: AuthProvider
) {
  const baseUrl = appBaseUrl(request, env);
  const url = new URL(request.url);
  const stored = decodeState(readCookie(request, OAUTH_COOKIE));
  const clearOAuth = clearCookie(OAUTH_COOKIE, request);

  if (url.searchParams.get("error")) {
    return authFailureRedirect(baseUrl, stored, "oauth_denied", [clearOAuth]);
  }

  if (
    !stored ||
    stored.provider !== provider ||
    stored.state !== url.searchParams.get("state")
  ) {
    return authFailureRedirect(
      baseUrl,
      stored,
      "oauth_state_invalid",
      [clearOAuth]
    );
  }

  const code = url.searchParams.get("code") ?? "";
  if (!code) {
    return authFailureRedirect(
      baseUrl,
      stored,
      "oauth_exchange_failed",
      [clearOAuth]
    );
  }

  try {
    const accessToken = await exchangeCode(env, provider, code, stored);
    const profile =
      provider === "google"
        ? await googleProfile(accessToken)
        : await githubProfile(accessToken);
    const userId = await upsertUser(env.DB, provider, profile);

    if (stored.mobile) {
      if (!stored.mobileChallenge) {
        return authFailureRedirect(
          baseUrl,
          stored,
          "oauth_state_invalid",
          [clearOAuth]
        );
      }

      const handoff = randomToken(32);
      const handoffHash = await hashSessionToken(handoff);
      const now = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + MOBILE_HANDOFF_TTL_SECONDS * 1000
      ).toISOString();

      await env.DB.batch([
        env.DB
          .prepare("DELETE FROM mobile_auth_codes WHERE expires_at <= ?")
          .bind(now),
        env.DB
          .prepare(
            `INSERT INTO mobile_auth_codes
             (code_hash, user_id, code_challenge, created_at, expires_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(
            handoffHash,
            userId,
            stored.mobileChallenge,
            now,
            expiresAt
          )
      ]);

      return redirect(mobileRedirect({ code: handoff }), [clearOAuth]);
    }

    const session = await createSession(env, userId);

    return redirect(`${baseUrl}${stored.next}`, [
      clearOAuth,
      cookie(
        SESSION_COOKIE,
        session.token,
        request,
        SESSION_TTL_SECONDS
      )
    ]);
  } catch (cause) {
    const code =
      cause instanceof AuthFlowError ? cause.code : "oauth_profile_failed";
    return authFailureRedirect(baseUrl, stored, code, [clearOAuth]);
  }
}

async function getUserById(
  env: AuthEnv,
  userId: string
): Promise<AuthUser | null> {
  const row = await env.DB
    .prepare(
      `SELECT id, email, name, avatar_url
       FROM users
       WHERE id = ?`
    )
    .bind(userId)
    .first<IdentityUserRow>();
  if (!row) return null;
  const identities = await env.DB
    .prepare(
      `SELECT provider FROM user_identities
       WHERE user_id = ?
       ORDER BY created_at ASC`
    )
    .bind(row.id)
    .all<{ provider: AuthProvider }>();

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    providers: (identities.results ?? [])
      .map((identity) => identity.provider)
      .filter(isProvider)
  };
}

export async function getSessionUser(
  env: AuthEnv,
  request: Request
): Promise<AuthUser | null> {
  const token = readBearer(request) || readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  const row = await env.DB
    .prepare(
      `SELECT user_id FROM sessions
       WHERE token_hash = ? AND expires_at > ?`
    )
    .bind(tokenHash, new Date().toISOString())
    .first<{ user_id: string }>();
  if (!row) return null;
  return getUserById(env, row.user_id);
}

export async function logout(request: Request, env: AuthEnv) {
  const bearer = readBearer(request);
  const token = bearer || readCookie(request, SESSION_COOKIE);
  if (token) {
    await env.DB
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await hashSessionToken(token))
      .run();
  }
  return bearer ? null : clearCookie(SESSION_COOKIE, request);
}

interface MobileAuthRow {
  user_id: string;
  code_challenge: string;
  expires_at: string;
  used_at: string | null;
}

export async function exchangeMobileAuth(
  request: Request,
  env: AuthEnv
) {
  let body: { code?: string; verifier?: string };
  try {
    body = (await request.json()) as { code?: string; verifier?: string };
  } catch {
    throw new AuthFlowError("invalid_mobile_code", "Invalid handoff");
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const verifier =
    typeof body.verifier === "string" ? body.verifier.trim() : "";
  if (!code || !verifier) {
    throw new AuthFlowError("invalid_mobile_code", "Invalid handoff");
  }

  const codeHash = await hashSessionToken(code);
  const row = await env.DB
    .prepare(
      `SELECT user_id, code_challenge, expires_at, used_at
       FROM mobile_auth_codes
       WHERE code_hash = ?`
    )
    .bind(codeHash)
    .first<MobileAuthRow>();
  const now = new Date().toISOString();

  if (!row || row.used_at || row.expires_at <= now) {
    throw new AuthFlowError("mobile_code_expired", "Sign-in expired");
  }

  const challenge = base64Url(await sha256(verifier));
  if (!row.code_challenge || challenge !== row.code_challenge) {
    throw new AuthFlowError("invalid_mobile_verifier", "Invalid sign-in");
  }

  const consumed = await env.DB
    .prepare(
      `UPDATE mobile_auth_codes
       SET used_at = ?
       WHERE code_hash = ? AND used_at IS NULL`
    )
    .bind(now, codeHash)
    .run();
  if ((consumed.meta?.changes ?? 0) !== 1) {
    throw new AuthFlowError("mobile_code_used", "Sign-in already used");
  }

  const session = await createSession(env, row.user_id);
  const user = await getUserById(env, row.user_id);
  if (!user) {
    throw new AuthFlowError("user_not_found", "Account not found");
  }

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user
  };
}
