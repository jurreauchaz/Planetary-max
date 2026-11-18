-- Direct digital sales extend the existing Base USDC verification contract.
-- DAT escrow remains unavailable until a payment network and contract are configured.
ALTER TABLE digital_products ADD COLUMN fulfillment_uri TEXT;
ALTER TABLE digital_products ADD COLUMN metadata_hash TEXT;
ALTER TABLE digital_products ADD COLUMN total_editions INTEGER NOT NULL DEFAULT 1 CHECK (total_editions BETWEEN 1 AND 1000000);
ALTER TABLE digital_products ADD COLUMN sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0 AND sold_count <= total_editions);

-- A receipt can fund only one acquisition across artwork and digital catalogs.
CREATE TABLE settlement_claims (
  tx_reference TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('artwork','digital')),
  asset_id TEXT NOT NULL
);
INSERT OR IGNORE INTO settlement_claims SELECT lower(tx_reference), 'artwork', artwork_id FROM transactions;
CREATE TRIGGER artwork_settlement_claim BEFORE INSERT ON transactions BEGIN
  INSERT INTO settlement_claims VALUES (lower(NEW.tx_reference), 'artwork', NEW.artwork_id);
END;

CREATE TABLE digital_orders (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES digital_products(id) ON DELETE RESTRICT,
  buyer_wallet TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL CHECK (currency IN ('USD','USDC')),
  tx_reference TEXT UNIQUE NOT NULL,
  edition_number INTEGER NOT NULL CHECK (edition_number >= 1),
  total_editions INTEGER NOT NULL CHECK (edition_number <= total_editions),
  title TEXT NOT NULL,
  metadata_hash TEXT NOT NULL,
  fulfillment_uri TEXT NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  certificate_hash TEXT UNIQUE NOT NULL,
  certificate_payload TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (payment_status = 'confirmed'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(product_id, edition_number)
);
CREATE TRIGGER digital_settlement_claim BEFORE INSERT ON digital_orders BEGIN
  INSERT INTO settlement_claims VALUES (lower(NEW.tx_reference), 'digital', NEW.product_id);
END;
CREATE TRIGGER digital_inventory AFTER INSERT ON digital_orders BEGIN
  UPDATE digital_products SET sold_count = sold_count + 1 WHERE id = NEW.product_id;
END;
-- These guards protect application-level history. A database administrator can
-- change schemas; D1 alone does not provide an externally anchored immutable log.
CREATE TRIGGER digital_orders_no_update BEFORE UPDATE ON digital_orders BEGIN SELECT RAISE(ABORT,'Settled orders are append-only'); END;
CREATE TRIGGER digital_orders_no_delete BEFORE DELETE ON digital_orders BEGIN SELECT RAISE(ABORT,'Settled orders are append-only'); END;
CREATE TRIGGER settlement_claims_no_update BEFORE UPDATE ON settlement_claims BEGIN SELECT RAISE(ABORT,'Settlement claims are append-only'); END;
CREATE TRIGGER settlement_claims_no_delete BEFORE DELETE ON settlement_claims BEGIN SELECT RAISE(ABORT,'Settlement claims are append-only'); END;
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON beemax_ledger_events BEGIN SELECT RAISE(ABORT,'Ledger events are append-only'); END;
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON beemax_ledger_events BEGIN SELECT RAISE(ABORT,'Ledger events are append-only'); END;
CREATE TRIGGER digital_publication_created AFTER INSERT ON digital_products BEGIN
  INSERT INTO beemax_ledger_events(id,entity_type,entity_id,action,payload_hash) VALUES (lower(hex(randomblob(16))),'digital_product',NEW.id,'CREATED:' || NEW.status,NEW.metadata_hash);
END;
CREATE TRIGGER digital_publication_updated AFTER UPDATE ON digital_products BEGIN
  INSERT INTO beemax_ledger_events(id,entity_type,entity_id,action,payload_hash) VALUES (lower(hex(randomblob(16))),'digital_product',NEW.id,'UPDATED:' || NEW.status,NEW.metadata_hash);
END;
CREATE TRIGGER digital_sale_recorded AFTER INSERT ON digital_orders BEGIN
  INSERT INTO beemax_ledger_events(id,entity_type,entity_id,action,actor_id,payload_hash) VALUES (lower(hex(randomblob(16))),'digital_order',NEW.id,'PAYMENT_CONFIRMED',NEW.buyer_wallet,NEW.certificate_hash);
END;
CREATE TRIGGER artwork_publication_created AFTER INSERT ON artworks BEGIN
  INSERT INTO beemax_ledger_events(id,entity_type,entity_id,action,payload_hash) VALUES (lower(hex(randomblob(16))),'artwork',NEW.id,'CREATED:' || NEW.status,NEW.metadata_hash);
END;
CREATE TRIGGER artwork_publication_updated AFTER UPDATE ON artworks BEGIN
  INSERT INTO beemax_ledger_events(id,entity_type,entity_id,action,payload_hash) VALUES (lower(hex(randomblob(16))),'artwork',NEW.id,'UPDATED:' || NEW.status,NEW.metadata_hash);
END;
CREATE TRIGGER artwork_sale_recorded AFTER INSERT ON transactions BEGIN
  INSERT INTO beemax_ledger_events(id,entity_type,entity_id,action,actor_id) VALUES (lower(hex(randomblob(16))),'artwork',NEW.artwork_id,'PAYMENT_CONFIRMED',NEW.buyer_wallet);
END;

CREATE TRIGGER digital_edition_supply_fixed BEFORE UPDATE OF total_editions ON digital_products
WHEN OLD.sold_count>0 AND NEW.total_editions!=OLD.total_editions BEGIN SELECT RAISE(ABORT,'Acquired edition supply is fixed'); END;
CREATE TRIGGER digital_publication_deleted AFTER DELETE ON digital_products BEGIN
  INSERT INTO beemax_ledger_events(id,entity_type,entity_id,action,payload_hash) VALUES (lower(hex(randomblob(16))),'digital_product',OLD.id,'DELETED',OLD.metadata_hash);
END;
CREATE TRIGGER artwork_publication_deleted AFTER DELETE ON artworks BEGIN
  INSERT INTO beemax_ledger_events(id,entity_type,entity_id,action,payload_hash) VALUES (lower(hex(randomblob(16))),'artwork',OLD.id,'DELETED',OLD.metadata_hash);
END;
