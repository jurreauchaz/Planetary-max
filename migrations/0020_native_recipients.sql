-- Preserve existing ledger entries while allowing recipient metadata on native credits.
ALTER TABLE transactions ADD COLUMN recipient_id TEXT
  CHECK (recipient_id IS NULL OR (status = 'SETTLED_NATIVE' AND length(trim(recipient_id)) BETWEEN 1 AND 100));
ALTER TABLE transactions ADD COLUMN memo TEXT
  CHECK (memo IS NULL OR (recipient_id IS NOT NULL AND length(memo) <= 500));
