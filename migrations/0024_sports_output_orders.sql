-- MAX-SPORTS output-order records. These are application records only; they do not
-- prove payment, custody, or settlement and are not written by the preview UI.
CREATE TABLE IF NOT EXISTS output_orders (
  order_id TEXT PRIMARY KEY,
  output_title TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  price_usdc TEXT NOT NULL DEFAULT '0.000000',
  delivery_mode TEXT NOT NULL DEFAULT 'OUTPUT_ONLY_NO_MODULE',
  reinvest_target TEXT NOT NULL DEFAULT 'MAX-COMPUTE',
  settlement_mode TEXT NOT NULL DEFAULT 'WALLET_FREE_PREVIEW',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_output_orders_created_at ON output_orders (created_at DESC);
