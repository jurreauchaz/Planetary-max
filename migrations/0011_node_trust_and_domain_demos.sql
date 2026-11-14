-- Trust registry and supplementary demo/catalog tables for the MAX edge worker.
-- Finance and chess demo records are explicitly non-redeemable and represent no funds.
CREATE TABLE IF NOT EXISTS trusted_nodes (
  node_id TEXT PRIMARY KEY,
  public_key_b64 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS node_signature_nonces (
  node_id TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (node_id, nonce),
  FOREIGN KEY (node_id) REFERENCES trusted_nodes(node_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_node_signature_nonces_expiry ON node_signature_nonces(expires_at);

-- Art catalog provenance only; this table does not represent a token or transfer.
CREATE TABLE IF NOT EXISTS art_provenance (
  artwork_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'MaxJ',
  image_url TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'DAT',
  proof_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'MINTED' CHECK (status IN ('MINTED', 'LISTED', 'SOLD')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_art_provenance_status ON art_provenance(status);

-- Demo match ledger only: no stake deposits, escrow custody, or payouts.
CREATE TABLE IF NOT EXISTS chess_escrow_demos (
  escrow_id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL UNIQUE,
  white_player TEXT NOT NULL,
  black_player TEXT NOT NULL,
  display_stake_amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SIMULATED_LOCKED'
    CHECK (status IN ('SIMULATED_LOCKED', 'SIMULATED_SETTLED', 'SIMULATED_CANCELLED')),
  winner TEXT,
  created_at INTEGER NOT NULL,
  settled_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_chess_escrow_demos_match ON chess_escrow_demos(match_id);
