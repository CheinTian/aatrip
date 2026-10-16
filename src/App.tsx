import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { api } from "./lib/api";
import type { TripSnapshot } from "./types";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { TripWorkspace } from "./components/TripWorkspace";

function tripIdFromHash() {
  const match = window.location.hash.match(/^#\/trip\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function App() {
  const [tripId, setTripId] = useState(tripIdFromHash);
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(tripId));
  const [error, setError] = useState("");

  const navigateToTrip = useCallback((id: string) => {
    window.location.hash = `#/trip/${encodeURIComponent(id)}`;
    setTripId(id);
  }, []);

  const loadTrip = useCallback(
    async (id: string, quiet = false) => {
      if (!quiet) setLoading(true);
      setError("");
      try {
        const nextSnapshot = await api.getTrip(id);
        setSnapshot(nextSnapshot);
        localStorage.setItem("aatrip:lastTrip", id);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "加载失败";
        setError(message);
        if (!quiet) setSnapshot(null);
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const onHashChange = () => {
      const nextId = tripIdFromHash();
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
    if (tripId) {
      void loadTrip(tripId);
    }
  }, [loadTrip, tripId]);

  const refresh = useCallback(async () => {
    if (tripId) await loadTrip(tripId, true);
  }, [loadTrip, tripId]);

  if (loading && tripId) {
    return (
      <main className="app-state">
        <div className="loader-mark" aria-hidden="true">
          <LoaderCircle size={28} />
        </div>
        <p>正在翻开账本...</p>
      </main>
    );
  }

  if (error && tripId && !snapshot) {
    return (
      <main className="app-state">
        <div className="error-mark" aria-hidden="true">
          <TriangleAlert size={28} />
        </div>
        <h1>这个账本暂时打不开</h1>
        <p>{error}</p>
        <button
          className="button button-dark"
          type="button"
          onClick={() => {
            window.location.hash = "";
          }}
        >
          返回首页
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

  return (
    <WelcomeScreen
      onOpenTrip={navigateToTrip}
      onCreateTrip={api.createTrip}
      onJoinTrip={api.joinTrip}
      onCreateDemo={api.createDemo}
    />
  );
}
