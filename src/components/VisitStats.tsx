import { useEffect, useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { recordVisit } from "../lib/visits";
import type { VisitStats as VisitStatsData } from "../types";

export function VisitStats() {
  const { locale, t } = useI18n();
  const [stats, setStats] = useState<VisitStatsData | null>(null);

  useEffect(() => {
    let active = true;
    recordVisit()
      .then((next) => {
        if (active) setStats(next);
      })
      .catch(() => {
        // A missing counter should never get in the way of the ledger.
      });
    return () => {
      active = false;
    };
  }, []);

  if (!stats) return null;

  const count = (value: number) => value.toLocaleString(locale);

  return (
    <div className="visit-stats">
      <span className="visit-stat">
        <Users size={14} aria-hidden="true" />
        {t("welcome.statsTotal")}
        <b>{count(stats.totalVisitors)}</b>
      </span>
      <span className="visit-stat">
        <CalendarDays size={14} aria-hidden="true" />
        {t("welcome.statsToday")}
        <b>{count(stats.todayVisitors)}</b>
      </span>
    </div>
  );
}
