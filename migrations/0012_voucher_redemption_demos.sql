-- Demo-only redemption receipts. These records do not represent payment or custody.
CREATE TABLE IF NOT EXISTS finance_voucher_demo_redemptions (
  voucher_id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (voucher_id) REFERENCES finance_voucher_demos(voucher_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_finance_voucher_demo_redemptions_node
  ON finance_voucher_demo_redemptions(node_id, created_at);
