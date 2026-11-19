-- Add server-owned MAX-SPORTS output-order settlement fields. Existing legacy rows remain
-- locked and are not treated as paid or delivered by this migration.
ALTER TABLE output_orders ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE output_orders ADD COLUMN tier_code TEXT NOT NULL DEFAULT '';
ALTER TABLE output_orders ADD COLUMN output_slug TEXT NOT NULL DEFAULT '';
ALTER TABLE output_orders ADD COLUMN quoted_price_usdc TEXT NOT NULL DEFAULT '0.000000';
ALTER TABLE output_orders ADD COLUMN currency TEXT NOT NULL DEFAULT 'BASE_USDC';
ALTER TABLE output_orders ADD COLUMN order_status TEXT NOT NULL DEFAULT 'quote_created';
ALTER TABLE output_orders ADD COLUMN settlement_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE output_orders ADD COLUMN tx_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE output_orders ADD COLUMN payer_address TEXT NOT NULL DEFAULT '';
ALTER TABLE output_orders ADD COLUMN recipient_address TEXT NOT NULL DEFAULT '';
ALTER TABLE output_orders ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'locked';
ALTER TABLE output_orders ADD COLUMN delivered_payload_ref TEXT NOT NULL DEFAULT '';
ALTER TABLE output_orders ADD COLUMN verified_at TEXT;
ALTER TABLE output_orders ADD COLUMN delivered_at TEXT;

UPDATE output_orders
SET quoted_price_usdc = price_usdc
WHERE quoted_price_usdc = '0.000000' AND price_usdc != '0.000000';

CREATE UNIQUE INDEX IF NOT EXISTS idx_output_orders_unique_tx_hash
  ON output_orders(tx_hash) WHERE tx_hash != '';
CREATE INDEX IF NOT EXISTS idx_output_orders_tenant_status
  ON output_orders(tenant_id, order_status, settlement_status);

-- Extend the established sovereign settlement table without replacing its existing
-- columns or uniqueness constraint. These fields link verified receipts to output orders.
ALTER TABLE settlement_events ADD COLUMN order_id TEXT NOT NULL DEFAULT '';
ALTER TABLE settlement_events ADD COLUMN token_contract TEXT NOT NULL DEFAULT '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
ALTER TABLE settlement_events ADD COLUMN verified_amount_usdc TEXT NOT NULL DEFAULT '0.000000';
ALTER TABLE settlement_events ADD COLUMN accounting_bucket TEXT NOT NULL DEFAULT 'verified_settlement';
ALTER TABLE settlement_events ADD COLUMN block_number TEXT NOT NULL DEFAULT '';
