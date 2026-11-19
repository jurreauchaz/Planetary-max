-- Legacy artwork fulfillment columns (fulfillment_uri, buyer_email, and
-- access_token) already exist in the production D1 database. Keep this
-- migration focused on the transaction table and indexes so it is safe there.
CREATE UNIQUE INDEX IF NOT EXISTS idx_artworks_access_token
  ON artworks(access_token) WHERE access_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artwork_id TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  tx_reference TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_transactions_artwork_id ON transactions(artwork_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
