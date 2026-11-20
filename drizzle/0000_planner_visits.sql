CREATE TABLE planner_visits (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  facility TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '',
  checks TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'complete', 'cancelled')),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX planner_visits_owner_date ON planner_visits (owner_id, date, time, id);
