-- Bind new settlement receipts to the verified paying wallet for safe access-link recovery.
ALTER TABLE transactions ADD COLUMN buyer_wallet TEXT;
