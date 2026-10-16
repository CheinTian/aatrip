-- Site visit counters.
--
-- One row per anonymous visitor per calendar day (Asia/Shanghai).
-- The visitor id is a random UUID generated in the browser; no IP address,
-- user agent or other personal data is stored.
CREATE TABLE IF NOT EXISTS visits (
  visitor_id TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 1 CHECK (view_count > 0),
  PRIMARY KEY (visitor_id, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
