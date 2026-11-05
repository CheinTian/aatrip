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

class AuthFlowError extends Error {
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
      verifier: typeof parsed.verifier === "string" ? parsed.verifier : ""
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
  const credentials = providerCredentials(env, provider);
  if (!credentials) {
    return redirect(`${baseUrl}/?auth_error=auth_not_configured`);
  }

  const url = new URL(request.url);
  const redirectUri = `${baseUrl}/api/auth/${provider}/callback`;
  const state = randomToken(24);
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
    verifier
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
    return redirect(`${baseUrl}/?auth_error=oauth_denied`, [clearOAuth]);
  }

  if (
    !stored ||
    stored.provider !== provider ||
    stored.state !== url.searchParams.get("state")
  ) {
    return redirect(`${baseUrl}/?auth_error=oauth_state_invalid`, [
      clearOAuth
    ]);
  }

  const code = url.searchParams.get("code") ?? "";
  if (!code) {
    return redirect(`${baseUrl}/?auth_error=oauth_exchange_failed`, [
      clearOAuth
    ]);
  }

  try {
    const accessToken = await exchangeCode(env, provider, code, stored);
    const profile =
      provider === "google"
        ? await googleProfile(accessToken)
        : await githubProfile(accessToken);
    const userId = await upsertUser(env.DB, provider, profile);
    const token = randomToken(32);
    const tokenHash = await hashSessionToken(token);
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + SESSION_TTL_SECONDS * 1000
    ).toISOString();

    await env.DB.batch([
      env.DB
        .prepare("DELETE FROM sessions WHERE expires_at <= ?")
        .bind(now),
      env.DB
        .prepare(
          `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
           VALUES (?, ?, ?, ?)`
        )
        .bind(tokenHash, userId, now, expiresAt)
    ]);

    return redirect(`${baseUrl}${stored.next}`, [
      clearOAuth,
      cookie(SESSION_COOKIE, token, request, SESSION_TTL_SECONDS)
    ]);
  } catch (cause) {
    const code =
      cause instanceof AuthFlowError ? cause.code : "oauth_profile_failed";
    return redirect(`${baseUrl}/?auth_error=${code}`, [clearOAuth]);
  }
}

export async function getSessionUser(
  env: AuthEnv,
  request: Request
): Promise<AuthUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  const row = await env.DB
    .prepare(
      `SELECT u.id, u.email, u.name, u.avatar_url
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .bind(tokenHash, new Date().toISOString())
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

export async function logout(request: Request, env: AuthEnv) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    await env.DB
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await hashSessionToken(token))
      .run();
  }
  return clearCookie(SESSION_COOKIE, request);
}
