-- Persist Portal browser state per anonymous, HttpOnly browser session cookie.
CREATE TABLE IF NOT EXISTS portal_sessions (
  node_id TEXT PRIMARY KEY,
  tabs_json TEXT NOT NULL,
  active_tab_id TEXT NOT NULL,
  secondary_tab_id TEXT,
  tiling_mode TEXT NOT NULL CHECK (tiling_mode IN ('single', 'split-h', 'split-v')),
  updated_at INTEGER NOT NULL
);
