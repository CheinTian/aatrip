import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { api, getErrorMessage } from "./lib/api";
import { useI18n, type TranslationKey } from "./lib/i18n";
import { recordVisit } from "./lib/visits";
import type { AuthSession, TripSnapshot } from "./types";
import { AuthDialog } from "./components/AuthDialog";
import { MyTripsScreen } from "./components/MyTripsScreen";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { TripWorkspace } from "./components/TripWorkspace";

function tripIdFromHash(hash = window.location.hash) {
  const match = hash.match(/^#\/trip\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function isTripsHash(hash: string) {
  return /^#\/trips(?:\?|$)/.test(hash);
}

function welcomeModeFromHash(hash: string): "create" | "join" {
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return "create";
  return new URLSearchParams(hash.slice(queryIndex + 1)).get("mode") === "join"
    ? "join"
    : "create";
}

export default function App() {
  const { t } = useI18n();
  const [tripId, setTripId] = useState(tripIdFromHash);
  const [hash, setHash] = useState(() => window.location.hash);
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(tripId));
  const [error, setError] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");

  const user = session?.user ?? null;
  const myTrips = isTripsHash(hash);

  const navigateToTrip = useCallback((id: string) => {
    window.location.hash = `#/trip/${encodeURIComponent(id)}`;
    setTripId(id);
  }, []);

  const openMyTrips = useCallback(() => {
    window.location.hash = "#/trips";
  }, []);

  const goHome = useCallback((mode: "create" | "join" = "create") => {
    window.location.hash = mode === "join" ? "#/?mode=join" : "#/";
  }, []);

  const openAuth = useCallback(() => {
    setAuthError("");
    setAuthOpen(true);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      setNotice(t("errors.logout_failed"));
      return;
    }
    setSession((current) =>
      current ? { ...current, user: null } : current
    );
    if (isTripsHash(window.location.hash)) {
      window.location.hash = "#/";
    }
  }, [t]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadTrip = useCallback(
    async (id: string, quiet = false) => {
      if (!quiet) setLoading(true);
      setError("");
      try {
        const nextSnapshot = await api.getTrip(id);
        setSnapshot(nextSnapshot);
        localStorage.setItem("aatrip:lastTrip", id);
      } catch (cause) {
        const message = getErrorMessage(cause, t, "errors.load_failed");
        setError(message);
        if (!quiet) setSnapshot(null);
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const onHashChange = () => {
      const nextHash = window.location.hash;
      setHash(nextHash);
      const nextId = tripIdFromHash(nextHash);
      setTripId(nextId);
      if (!nextId) {
        setSnapshot(null);
        setError("");
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("auth_error");
    if (code) {
      const key = `errors.${code}` as TranslationKey;
      const translated = t(key);
      setAuthError(
        translated === key ? t("errors.request_failed") : translated
      );
      setAuthOpen(true);
      params.delete("auth_error");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${
          window.location.hash
        }`
      );
    }

    void api
      .getSession()
      .then(setSession)
      .catch(() =>
        setSession({
          user: null,
          providers: { google: false, github: false }
        })
      )
      .finally(() => setSessionLoading(false));
  }, [t]);

  useEffect(() => {
    if (!sessionLoading && !user && myTrips) {
      setAuthOpen(true);
      window.location.hash = "#/";
    }
  }, [myTrips, sessionLoading, user]);

  useEffect(() => {
    if (tripId) {
      void loadTrip(tripId);
    }
  }, [loadTrip, tripId]);

  useEffect(() => {
    // Count the site visit as soon as the app is opened, whatever the route.
    void recordVisit().catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    if (tripId) await loadTrip(tripId, true);
  }, [loadTrip, tripId]);

  if ((loading && tripId) || (myTrips && sessionLoading)) {
    return (
      <main className="app-state">
        <div className="loader-mark" aria-hidden="true">
          <LoaderCircle size={28} />
        </div>
        <p>{t("app.loading")}</p>
      </main>
    );
  }

  if (error && tripId && !snapshot) {
    return (
      <main className="app-state">
        <div className="error-mark" aria-hidden="true">
          <TriangleAlert size={28} />
        </div>
        <h1>{t("app.errorTitle")}</h1>
        <p>{error}</p>
        <button
          className="button button-dark"
          type="button"
          onClick={() => {
            window.location.hash = "";
          }}
        >
          {t("common.returnHome")}
        </button>
      </main>
    );
  }

  if (snapshot && tripId) {
    return (
      <TripWorkspace
        snapshot={snapshot}
        onRefresh={refresh}
        onLeave={() => {
          window.location.hash = "";
        }}
      />
    );
  }

  if (myTrips && user) {
    return (
      <>
        <MyTripsScreen
          user={user}
          onOpenTrip={navigateToTrip}
          onOpenTrips={openMyTrips}
          onGoHome={goHome}
          onSignOut={signOut}
        />
        <AuthDialog
          open={authOpen}
          providers={session?.providers ?? { google: false, github: false }}
          error={authError}
          onClose={() => {
            setAuthOpen(false);
            setAuthError("");
          }}
        />
        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
      </>
    );
  }

  if (myTrips && !user) {
    return (
      <main className="app-state">
        <div className="loader-mark" aria-hidden="true">
          <LoaderCircle size={28} />
        </div>
        <p>{t("app.loading")}</p>
      </main>
    );
  }

  return (
    <>
      <WelcomeScreen
        onOpenTrip={navigateToTrip}
        onCreateTrip={api.createTrip}
        onJoinTrip={api.joinTrip}
        onCreateDemo={api.createDemo}
        user={user}
        initialMode={welcomeModeFromHash(hash)}
        onLogin={openAuth}
        onOpenTrips={openMyTrips}
        onSignOut={signOut}
      />
      <AuthDialog
        open={authOpen}
        providers={session?.providers ?? { google: false, github: false }}
        error={authError}
        onClose={() => {
          setAuthOpen(false);
          setAuthError("");
        }}
      />
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  );
}
