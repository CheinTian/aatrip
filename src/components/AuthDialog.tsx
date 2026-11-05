import { useEffect, useState } from "react";
import { ArrowRight, Github, LoaderCircle, Lock, X } from "lucide-react";
import { useI18n } from "../lib/i18n";
import type { AuthProvider, AuthProviders } from "../types";
import { BrandMark } from "./BrandMark";

interface AuthDialogProps {
  open: boolean;
  providers: AuthProviders;
  error?: string;
  next?: string;
  onClose: () => void;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.92A6.02 6.02 0 0 1 6.1 12c0-.67.11-1.32.31-1.92V7.49H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.51l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  );
}

export function AuthDialog({
  open,
  providers,
  error = "",
  next = "/#/trips",
  onClose
}: AuthDialogProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<AuthProvider | "">("");

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("dialog-open");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("dialog-open");
    };
  }, [busy, onClose, open]);

  if (!open) return null;

  function signIn(provider: AuthProvider) {
    if (!providers[provider] || busy) return;
    setBusy(provider);
    window.location.assign(
      `/api/auth/${provider}/start?next=${encodeURIComponent(next)}`
    );
  }

  return (
    <div
      className="dialog-backdrop auth-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
      >
        <button
          className="auth-close"
          type="button"
          aria-label={t("common.close")}
          onClick={onClose}
          disabled={Boolean(busy)}
        >
          <X size={18} />
        </button>

        <div className="auth-ticket" aria-hidden="true">
          <BrandMark variant="route" size={64} className="auth-ticket-mark" />
          <span>ACCOUNT · 2026</span>
          <span className="auth-ticket-code">····</span>
        </div>

        <div className="auth-dialog-body">
          <span className="auth-kicker">{t("auth.dialogKicker")}</span>
          <h2 id="auth-dialog-title">{t("auth.title")}</h2>
          <p className="auth-copy">{t("auth.copy")}</p>

          {error && (
            <div className="auth-error" role="alert">
              <strong>{t("auth.errorTitle")}</strong>
              <span>{error}</span>
            </div>
          )}

          <div className="auth-providers">
            <button
              className="auth-provider auth-google"
              type="button"
              disabled={!providers.google || Boolean(busy)}
              onClick={() => signIn("google")}
            >
              <span className="auth-provider-mark">
                {busy === "google" ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <GoogleMark />
                )}
              </span>
              <span className="auth-provider-copy">
                <b>{t("auth.google")}</b>
                {!providers.google && <small>{t("auth.unavailable")}</small>}
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>

            <button
              className="auth-provider auth-github"
              type="button"
              disabled={!providers.github || Boolean(busy)}
              onClick={() => signIn("github")}
            >
              <span className="auth-provider-mark">
                {busy === "github" ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <Github size={20} />
                )}
              </span>
              <span className="auth-provider-copy">
                <b>{t("auth.github")}</b>
                {!providers.github && <small>{t("auth.unavailable")}</small>}
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>

          <p className="auth-privacy">
            <Lock size={13} aria-hidden="true" />
            {t("auth.privacy")}
          </p>

          <button
            className="auth-guest"
            type="button"
            onClick={onClose}
            disabled={Boolean(busy)}
          >
            {t("auth.guest")}
          </button>
        </div>
      </section>
    </div>
  );
}
