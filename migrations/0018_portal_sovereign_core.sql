PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sovereign_identities (
  identity_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  identity_type TEXT NOT NULL CHECK (identity_type IN ('ROOT', 'ARTISTIC_ALIAS', 'ICV_AGENT', 'CREATOR', 'COLLECTOR')),
  pqc_public_key TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS dat_assets (
  dat_id TEXT PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain IN ('MAX_ART', 'MAX_CHESS', 'MAX_SPORT')),
  asset_type TEXT NOT NULL,
  title TEXT NOT NULL,
  originator_id TEXT NOT NULL REFERENCES sovereign_identities(identity_id),
  current_owner_id TEXT NOT NULL REFERENCES sovereign_identities(identity_id),
  content_hash TEXT NOT NULL UNIQUE,
  artifact_uri TEXT NOT NULL,
  pqc_signature TEXT NOT NULL,
  royalty_bps INTEGER NOT NULL DEFAULT 1000 CHECK (royalty_bps BETWEEN 0 AND 10000),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'VAULTED', 'REVOKED')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS dat_provenance_events (
  event_id TEXT PRIMARY KEY,
  dat_id TEXT NOT NULL REFERENCES dat_assets(dat_id),
  event_type TEXT NOT NULL CHECK (event_type IN ('MINTED', 'VERIFIED', 'LICENSED', 'TRANSFERRED', 'ATTESTED', 'VAULTED')),
  from_identity_id TEXT REFERENCES sovereign_identities(identity_id),
  to_identity_id TEXT NOT NULL REFERENCES sovereign_identities(identity_id),
  prev_event_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL UNIQUE,
  actor_signature TEXT NOT NULL,
  settlement_ref TEXT,
  occurred_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_dat_events_asset ON dat_provenance_events(dat_id, occurred_at ASC);
CREATE INDEX IF NOT EXISTS idx_dat_domain_owner ON dat_assets(domain, current_owner_id);

CREATE TABLE IF NOT EXISTS dat_ext_art (
  dat_id TEXT PRIMARY KEY REFERENCES dat_assets(dat_id) ON DELETE CASCADE,
  medium TEXT NOT NULL,
  dimensions TEXT,
  edition_number INTEGER NOT NULL DEFAULT 1,
  edition_total INTEGER NOT NULL DEFAULT 1,
  doctrine_tag TEXT DEFAULT 'JURREAUISM',
  CHECK (edition_number > 0 AND edition_total >= edition_number)
);
CREATE TABLE IF NOT EXISTS dat_ext_chess (
  dat_id TEXT PRIMARY KEY REFERENCES dat_assets(dat_id) ON DELETE CASCADE,
  white_player_id TEXT NOT NULL,
  black_player_id TEXT NOT NULL,
  eco_code TEXT,
  opening_name TEXT,
  result TEXT NOT NULL CHECK (result IN ('1-0', '0-1', '1/2-1/2', '*')),
  pgn_hash TEXT NOT NULL,
  move_count INTEGER NOT NULL CHECK (move_count >= 0)
);
CREATE TABLE IF NOT EXISTS dat_ext_sports (
  dat_id TEXT PRIMARY KEY REFERENCES dat_assets(dat_id) ON DELETE CASCADE,
  league TEXT NOT NULL CHECK (league IN ('NFL', 'NBA', 'WNBA', 'MLB', 'SOCCER', 'MMA', 'COLLEGIATE', 'ESPORTS')),
  match_external_id TEXT NOT NULL,
  artifact_category TEXT NOT NULL CHECK (artifact_category IN ('PREDICTION_MODEL', 'TELEMETRY_FEED', 'NIL_CONTRACT', 'PERFORMANCE_PROOF')),
  oracle_consensus TEXT NOT NULL,
  season_year INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS treasury_waterfall_ledger (
  tx_id TEXT PRIMARY KEY,
  source_domain TEXT NOT NULL CHECK (source_domain IN ('MAX_ART', 'MAX_CHESS', 'MAX_SPORT', 'MAX_TELECOM', 'API_GATEWAY')),
  gross_amount_usd REAL NOT NULL CHECK (gross_amount_usd >= 0),
  private_sweep_usd REAL NOT NULL CHECK (private_sweep_usd >= 0),
  tax_escrow_usd REAL NOT NULL CHECK (tax_escrow_usd >= 0),
  ops_buffer_usd REAL NOT NULL CHECK (ops_buffer_usd >= 0),
  endowment_usd REAL NOT NULL CHECK (endowment_usd >= 0),
  legal_class TEXT NOT NULL,
  onchain_tx_hash TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CHECK (abs(gross_amount_usd - private_sweep_usd - tax_escrow_usd - ops_buffer_usd - endowment_usd) < 0.011)
);
CREATE INDEX IF NOT EXISTS idx_waterfall_time ON treasury_waterfall_ledger(created_at DESC);
