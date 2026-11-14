-- Fields required for verified USDC collector fulfillment. Keep purchase state on the existing artwork record.
ALTER TABLE artworks ADD COLUMN fulfillment_uri TEXT;
ALTER TABLE artworks ADD COLUMN buyer_email TEXT;
ALTER TABLE artworks ADD COLUMN access_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_artworks_access_token ON artworks(access_token) WHERE access_token IS NOT NULL;

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
