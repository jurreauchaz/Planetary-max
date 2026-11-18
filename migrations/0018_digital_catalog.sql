-- Additive catalog for games, apps and published media. Existing art, identity,
-- order, escrow and registry tables are preserved.
CREATE TABLE digital_products (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('game', 'app', 'media')),
  title TEXT NOT NULL,
  creator TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'DAT' CHECK (currency IN ('DAT', 'USD', 'USDC')),
  platform TEXT NOT NULL DEFAULT 'Web',
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_digital_products_public ON digital_products(status, kind, created_at);
