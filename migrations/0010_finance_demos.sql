-- Demo-only finance activity records. No actual vouchers, funds, or yield are represented.
CREATE TABLE IF NOT EXISTS finance_voucher_demos (
  voucher_id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  display_amount TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USDC', 'USDT')),
  status TEXT NOT NULL DEFAULT 'SIMULATED' CHECK (status = 'SIMULATED'),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_yield_demos (
  id TEXT PRIMARY KEY,
  source_module TEXT NOT NULL CHECK (source_module IN ('MAX-ART', 'MAX-CHESS', 'MAX-SPORTS')),
  display_amount TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_finance_voucher_demos_created ON finance_voucher_demos(created_at);
CREATE INDEX IF NOT EXISTS idx_finance_yield_demos_created ON finance_yield_demos(created_at);
