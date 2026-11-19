-- MAX-FINANCE / MAX-SOVEREIGN non-custodial ledger and reinvestment schema.
-- These records are application bookkeeping only; they do not prove or execute payments.
-- Never store private keys, seed phrases, or wallet credentials here.
CREATE TABLE IF NOT EXISTS ledger_accounts (
  account_id TEXT PRIMARY KEY,
  public_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 8453,
  rail TEXT NOT NULL DEFAULT 'BASE_USDC',
  account_role TEXT NOT NULL,
  owner_scope TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_scope ON ledger_accounts (owner_scope, is_active);

CREATE TABLE IF NOT EXISTS settlement_events (
  event_id TEXT PRIMARY KEY,
  tx_hash TEXT NOT NULL UNIQUE,
  chain_id INTEGER NOT NULL DEFAULT 8453,
  rail TEXT NOT NULL DEFAULT 'BASE_USDC',
  source_kind TEXT NOT NULL,
  release_id TEXT,
  match_or_market_id TEXT,
  from_address TEXT,
  to_address TEXT NOT NULL,
  amount_usdc TEXT NOT NULL,
  escrow_status TEXT NOT NULL DEFAULT 'settled',
  reinvest_target TEXT NOT NULL DEFAULT 'MAX-ECOSYSTEM',
  reinvest_share_pct REAL NOT NULL DEFAULT 0.0,
  notes TEXT,
  settled_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_settlement_events_release ON settlement_events (release_id, settled_at);
CREATE INDEX IF NOT EXISTS idx_settlement_events_reinvest ON settlement_events (reinvest_target, escrow_status);

CREATE TABLE IF NOT EXISTS balance_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  public_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 8453,
  scope TEXT NOT NULL,
  settled_untouched_usdc TEXT NOT NULL DEFAULT '0.00',
  active_escrow_usdc TEXT NOT NULL DEFAULT '0.00',
  reinvest_allocated_usdc TEXT NOT NULL DEFAULT '0.00',
  last_observed_tx_hash TEXT,
  observed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES ledger_accounts (account_id)
);
CREATE INDEX IF NOT EXISTS idx_balance_snapshots_scope_time ON balance_snapshots (scope, observed_at DESC);

CREATE TABLE IF NOT EXISTS reinvestment_allocations (
  allocation_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  target_module TEXT NOT NULL,
  source_event_id TEXT,
  allocated_usdc TEXT NOT NULL DEFAULT '0.00',
  allocation_status TEXT NOT NULL DEFAULT 'planned',
  rationale TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_event_id) REFERENCES settlement_events (event_id)
);
CREATE INDEX IF NOT EXISTS idx_reinvestment_target_status ON reinvestment_allocations (target_module, allocation_status);

CREATE TABLE IF NOT EXISTS sovereign_policy_log (
  policy_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'MAX-SOVEREIGN',
  policy_key TEXT NOT NULL,
  policy_value TEXT NOT NULL,
  notes TEXT,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sovereign_policy_key ON sovereign_policy_log (policy_key, recorded_at DESC);

CREATE TABLE IF NOT EXISTS arena_feeds (
  item_id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  formula_or_meta TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arena_feeds_domain ON arena_feeds (domain, updated_at DESC);
