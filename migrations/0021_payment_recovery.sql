-- Payment exceptions stay globally claimed until the publisher returns funds.
ALTER TABLE digital_products ADD COLUMN delivery_protection TEXT CHECK (delivery_protection IN ('encrypted','access_controlled'));
CREATE TABLE digital_payment_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES digital_products(id) ON DELETE RESTRICT,
  buyer_wallet TEXT NOT NULL,
  tx_reference TEXT UNIQUE NOT NULL,
  amount_units TEXT NOT NULL CHECK (length(amount_units)>0 AND amount_units NOT GLOB '*[^0-9]*' AND amount_units!='0'),
  treasury TEXT NOT NULL,
  token_contract TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_refund' CHECK (status IN ('pending_refund','refunded')),
  refund_tx_reference TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ((status='pending_refund' AND refund_tx_reference IS NULL) OR (status='refunded' AND refund_tx_reference IS NOT NULL))
);
CREATE TRIGGER payment_review_claim BEFORE INSERT ON digital_payment_reviews BEGIN
  INSERT INTO settlement_claims VALUES (lower(NEW.tx_reference),'digital',NEW.product_id);
END;
CREATE TRIGGER payment_review_created AFTER INSERT ON digital_payment_reviews BEGIN
  INSERT INTO beemax_ledger_events(id,entity_type,entity_id,action,actor_id) VALUES (lower(hex(randomblob(16))),'payment_review',NEW.id,'REFUND_REQUIRED',NEW.buyer_wallet);
END;
CREATE TRIGGER payment_review_resolved AFTER UPDATE ON digital_payment_reviews BEGIN
  INSERT INTO beemax_ledger_events(id,entity_type,entity_id,action,actor_id) VALUES (lower(hex(randomblob(16))),'payment_review',NEW.id,'REFUND_VERIFIED',NEW.buyer_wallet);
END;
CREATE TRIGGER payment_review_no_delete BEFORE DELETE ON digital_payment_reviews BEGIN SELECT RAISE(ABORT,'Payment reviews cannot be deleted'); END;
CREATE TRIGGER payment_review_guard BEFORE UPDATE ON digital_payment_reviews
WHEN OLD.status='refunded' OR NEW.status!='refunded' OR NEW.id!=OLD.id OR NEW.product_id!=OLD.product_id OR NEW.buyer_wallet!=OLD.buyer_wallet OR NEW.tx_reference!=OLD.tx_reference OR NEW.amount_units!=OLD.amount_units OR NEW.treasury!=OLD.treasury OR NEW.token_contract!=OLD.token_contract OR NEW.reason!=OLD.reason OR NEW.created_at!=OLD.created_at
BEGIN SELECT RAISE(ABORT,'Only a verified refund can resolve a payment review'); END;
