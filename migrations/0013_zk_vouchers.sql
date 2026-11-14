-- Add-on migration for the existing Planetary-Max D1 schema.
-- The trust registry and replay guard are defined in 0011_node_trust_and_domain_demos.sql.
-- Voucher rows are digital claim metadata only; this table does not custody or transfer funds.
CREATE TABLE IF NOT EXISTS zk_vouchers (
  voucher_id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  amount TEXT NOT NULL CHECK (CAST(amount AS REAL) > 0),
  currency TEXT NOT NULL DEFAULT 'USDC' CHECK (currency IN ('USDC', 'USDT')),
  proof_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REDEEMED', 'EXPIRED')),
  created_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  FOREIGN KEY (node_id) REFERENCES trusted_nodes(node_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_zk_vouchers_node_status
  ON zk_vouchers(node_id, status);
