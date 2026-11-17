-- Extend the existing payment ledger with authenticated native credit records.
-- Rebuild is required to widen the status CHECK and make item_id writable.
-- Legacy payments retain artwork, collector and transaction-reference constraints.
CREATE TABLE transactions_native_upgrade (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artwork_id TEXT REFERENCES artworks(id) ON DELETE RESTRICT,
  item_id TEXT NOT NULL CHECK (length(trim(item_id)) BETWEEN 1 AND 100),
  buyer_email TEXT,
  tx_reference TEXT NOT NULL UNIQUE,
  amount INTEGER CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USDC',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed', 'SETTLED_NATIVE')),
  created_at INTEGER NOT NULL,
  actor_id TEXT REFERENCES trusted_nodes(node_id) ON DELETE RESTRICT,
  CHECK (
    (status = 'SETTLED_NATIVE' AND actor_id IS NOT NULL AND currency = 'SOV_CREDIT'
      AND typeof(amount) = 'integer' AND amount > 0 AND amount <= 9007199254740991)
    OR
    (status != 'SETTLED_NATIVE' AND artwork_id IS NOT NULL AND buyer_email IS NOT NULL AND item_id = artwork_id)
  )
);
INSERT INTO transactions_native_upgrade (id, artwork_id, item_id, buyer_email, tx_reference, amount, currency, status, created_at)
SELECT id, artwork_id, item_id, buyer_email, tx_reference, amount, currency, status, created_at FROM transactions;
-- Preserve AUTOINCREMENT history even when the highest previous row was deleted.
INSERT INTO sqlite_sequence (name, seq)
SELECT 'transactions_native_upgrade', seq FROM sqlite_sequence
WHERE name = 'transactions' AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'transactions_native_upgrade');
UPDATE sqlite_sequence SET seq = max(seq, COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'transactions'), 0))
WHERE name = 'transactions_native_upgrade';
DROP TABLE transactions;
ALTER TABLE transactions_native_upgrade RENAME TO transactions;
CREATE INDEX idx_transactions_artwork_id ON transactions(artwork_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_actor ON transactions(actor_id, created_at);
