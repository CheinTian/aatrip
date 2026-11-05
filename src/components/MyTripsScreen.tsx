import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  LoaderCircle,
  LogOut,
  MapPin,
  Plus,
  Receipt,
  RefreshCw,
  Ticket,
  Users
} from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { AuthUser, UserTrip } from "../types";
import { AccountMenu } from "./AccountMenu";
import { BrandMark } from "./BrandMark";
import { LanguageSwitch } from "./LanguageSwitch";

interface MyTripsScreenProps {
  user: AuthUser;
  onOpenTrip: (id: string) => void;
  onOpenTrips: () => void;
  onGoHome: (mode?: "create" | "join") => void;
  onSignOut: () => void | Promise<void>;
}

export function MyTripsScreen({
  user,
  onOpenTrip,
  onOpenTrips,
  onGoHome,
  onSignOut
}: MyTripsScreenProps) {
  const { t, formatDate, formatDateRange, formatMoney } = useI18n();
  const [trips, setTrips] = useState<UserTrip[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const result = await api.getMyTrips();
      setTrips(result.trips);
      setState("ready");
    } catch (cause) {
      setError(getErrorMessage(cause, t, "mytrips.loadError"));
      setState("error");
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function handleLeave(trip: UserTrip) {
    if (!window.confirm(t("mytrips.leaveConfirm", { name: trip.name }))) {
      return;
    }
    setLeaving(trip.id);
    try {
      await api.leaveTrip(trip.id);
      setTrips((current) => current.filter((entry) => entry.id !== trip.id));
      setNotice(t("mytrips.left"));
    } catch (cause) {
      setNotice(getErrorMessage(cause, t, "errors.leave_trip_failed"));
    } finally {
      setLeaving("");
    }
  }

  return (
    <main className="mytrips-page">
      <header className="welcome-nav mytrips-nav">
        <a className="brand" href="#/" aria-label={t("welcome.homeLabel")}>
          <BrandMark />
          <span className="brand-copy">
            <b>{t("brand.name")}</b>
            <small>{t("brand.tagline")}</small>
          </span>
        </a>
        <div className="welcome-actions">
          <LanguageSwitch />
          <AccountMenu
            user={user}
            onOpenTrips={onOpenTrips}
            onSignOut={onSignOut}
          />
        </div>
      </header>

      <section className="mytrips-hero">
        <div className="mytrips-hero-copy">
          <div className="story-kicker">
            <span>{t("mytrips.kicker")}</span>
            <span className="story-line" />
            <span>
              {t("mytrips.count", {
                count: state === "ready" ? trips.length : "··"
              })}
            </span>
          </div>
          <h1>{t("mytrips.greeting", { name: user.name })}</h1>
          <p>{t("mytrips.copy")}</p>
        </div>
        <div className="mytrips-hero-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => onGoHome("create")}
          >
            <Plus size={18} />
            {t("mytrips.newTrip")}
          </button>
          <button
            className="button button-ghost"
            type="button"
            onClick={() => onGoHome("join")}
          >
            <Ticket size={18} />
            {t("mytrips.joinTrip")}
          </button>
        </div>
      </section>

      <section className="mytrips-content" aria-live="polite">
        {state === "loading" && (
          <div className="mytrips-state">
            <LoaderCircle className="spin" size={26} />
            <p>{t("mytrips.loading")}</p>
          </div>
        )}

        {state === "error" && (
          <div className="mytrips-state mytrips-state-error">
            <strong>{t("mytrips.loadError")}</strong>
            <p>{error}</p>
            <button
              className="button button-ghost"
              type="button"
              onClick={() => void load()}
            >
              <RefreshCw size={16} />
              {t("mytrips.retry")}
            </button>
          </div>
        )}

        {state === "ready" && trips.length === 0 && (
          <div className="mytrips-empty">
            <div className="empty-ticket" aria-hidden="true">
              <span>TRIP CODE</span>
              <strong>6</strong>
              <small>{t("welcome.inviteCodeHint")}</small>
            </div>
            <h2>{t("mytrips.emptyTitle")}</h2>
            <p>{t("mytrips.emptyCopy")}</p>
            <div className="mytrips-empty-actions">
              <button
                className="button button-primary"
                type="button"
                onClick={() => onGoHome("create")}
              >
                <Plus size={18} />
                {t("mytrips.newTrip")}
              </button>
              <button
                className="button button-ghost"
                type="button"
                onClick={() => onGoHome("join")}
              >
                <Ticket size={18} />
                {t("mytrips.joinTrip")}
              </button>
            </div>
          </div>
        )}

        {state === "ready" && trips.length > 0 && (
          <div className="trip-grid">
            {trips.map((trip, index) => (
              <article
                className="trip-card"
                key={trip.id}
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <a
                  className="trip-card-main"
                  href={`#/trip/${encodeURIComponent(trip.id)}`}
                  onClick={(event) => {
                    event.preventDefault();
                    onOpenTrip(trip.id);
                  }}
                >
                  <div className="trip-card-top">
                    <span className={`trip-role ${trip.role}`}>
                      {trip.role === "owner"
                        ? t("mytrips.owner")
                        : t("mytrips.member")}
                    </span>
                    <span className="trip-card-code">{trip.inviteCode}</span>
                  </div>
                  <h2>{trip.name}</h2>
                  <p className="trip-card-destination">
                    <MapPin size={15} />
                    {trip.destination || t("mytrips.noDestination")}
                  </p>
                  <p className="trip-card-dates">
                    <CalendarDays size={15} />
                    {formatDateRange(trip.startDate, trip.endDate)}
                  </p>
                  <div className="trip-card-stats">
                    <span>
                      <Users size={15} />
                      {trip.memberCount}
                    </span>
                    <span>
                      <Receipt size={15} />
                      {trip.expenseCount}
                    </span>
                    <span className="trip-card-total">
                      <small>{t("mytrips.total")}</small>
                      <b>
                        {formatMoney(trip.totalCents, trip.currency, {
                          compact: true
                        })}
                      </b>
                    </span>
                  </div>
                  <span className="trip-card-open">
                    {t("mytrips.open")}
                    <ArrowRight size={16} />
                  </span>
                </a>

                <footer className="trip-card-footer">
                  <span>
                    {t("mytrips.updated", {
                      date: formatDate(
                        (trip.lastActivityAt || trip.joinedAt).slice(0, 10)
                      )
                    })}
                  </span>
                  <button
                    className="trip-leave"
                    type="button"
                    disabled={leaving === trip.id}
                    onClick={() => void handleLeave(trip)}
                  >
                    {leaving === trip.id ? (
                      <LoaderCircle className="spin" size={14} />
                    ) : (
                      <LogOut size={14} />
                    )}
                    {t("mytrips.leave")}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="welcome-footer mytrips-footer">
        <div className="welcome-footer-line">
          <span>AA</span>
          <p>{t("welcome.footer")}</p>
          <span>2026</span>
        </div>
      </footer>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </main>
  );
}
