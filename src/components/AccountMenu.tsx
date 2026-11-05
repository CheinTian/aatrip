import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Route } from "lucide-react";
import { initials } from "../lib/format";
import { useI18n } from "../lib/i18n";
import type { AuthUser } from "../types";

interface AccountMenuProps {
  user: AuthUser;
  onOpenTrips: () => void;
  onSignOut: () => void | Promise<void>;
}

export function AccountMenu({
  user,
  onOpenTrips,
  onSignOut
}: AccountMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        className="account-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("account.menu")} · ${user.name}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-avatar" aria-hidden="true">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            initials(user.name)
          )}
        </span>
        <span className="account-trigger-copy">
          <b>{user.name}</b>
          <small>{t("account.signedIn")}</small>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {open && (
        <div className="account-popover" role="menu">
          <div className="account-identity">
            <span>{user.email || t("account.signedIn")}</span>
            <small>
              {user.providers
                .map((provider) =>
                  provider === "google" ? "Google" : "GitHub"
                )
                .join(" · ")}
            </small>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenTrips();
            }}
          >
            <Route size={16} />
            {t("account.myTrips")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="account-signout"
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
          >
            <LogOut size={16} />
            {t("account.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
