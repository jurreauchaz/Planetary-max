-- MAX Chess and MAX Sports domain tables.
-- The artworks table is already defined by migrations/0001_initial.sql and
-- extended by later migrations; do not recreate it with a conflicting shape.

CREATE TABLE IF NOT EXISTS chess_games (
  game_id TEXT PRIMARY KEY,
  white_player TEXT NOT NULL,
  black_player TEXT NOT NULL,
  pgn_data TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_chess_games_status_updated
  ON chess_games(status, updated_at);

CREATE TABLE IF NOT EXISTS sports_telemetry (
  event_id TEXT PRIMARY KEY,
  league TEXT NOT NULL,
  matchup TEXT NOT NULL,
  oracle_consensus_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_sports_telemetry_league_updated
  ON sports_telemetry(league, updated_at);
