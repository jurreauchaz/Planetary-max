-- Settlement receipts are unique across orders; payment evidence is separate from quorum release.
CREATE TABLE marketplace_payment_receipts (
  payment_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES marketplace_orders(id),
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  currency TEXT NOT NULL,
  settled_at INTEGER NOT NULL
);
CREATE TABLE marketplace_order_nonces (
  user_id TEXT NOT NULL REFERENCES users(id),
  nonce TEXT NOT NULL,
  PRIMARY KEY(user_id, nonce)
);
ALTER TABLE marketplace_orders ADD COLUMN escrow_release_id TEXT;
ALTER TABLE marketplace_orders ADD COLUMN escrow_released_at TEXT;
