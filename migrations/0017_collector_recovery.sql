-- buyer_wallet already exists in the production transactions table. Add an
-- index for wallet-bound receipt lookups instead of attempting to add it again.
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_wallet
  ON transactions(buyer_wallet);
