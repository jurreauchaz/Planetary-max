CREATE TABLE IF NOT EXISTS artist_profiles (
    user_id TEXT PRIMARY KEY,
    bio TEXT,
    portfolio_url TEXT,
    verified_status INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS artworks (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    title TEXT NOT NULL,
    medium TEXT NOT NULL,
    dimensions TEXT,
    price_cents INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    status TEXT CHECK(status IN ('available', 'reserved', 'sold')) DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    edition_number INTEGER NOT NULL DEFAULT 1,
    total_editions INTEGER NOT NULL DEFAULT 1,
    metadata_hash TEXT,
    FOREIGN KEY (artist_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (edition_number >= 1),
    CHECK (total_editions >= 1 AND edition_number <= total_editions)
);

CREATE TABLE IF NOT EXISTS marketplace_orders (
    id TEXT PRIMARY KEY,
    artwork_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    edition_number INTEGER,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id)
);
