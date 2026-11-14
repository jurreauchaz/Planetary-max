-- Demo request ledger only; this table does not represent vouchers, escrow, or transferred funds.
CREATE TABLE IF NOT EXISTS treasury_withdrawal_demos (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL,
  destination_node TEXT NOT NULL,
  display_amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SIMULATED' CHECK (status = 'SIMULATED'),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_treasury_withdrawal_demos_created_at
  ON treasury_withdrawal_demos(created_at);
