-- Extend existing catalog, match, event and verified payment contracts.
ALTER TABLE artworks ADD COLUMN artist TEXT NOT NULL DEFAULT '';
ALTER TABLE artworks ADD COLUMN category TEXT NOT NULL DEFAULT 'Digital';
UPDATE artworks SET artist = COALESCE((SELECT username FROM users WHERE users.id = artworks.artist_id), 'Unknown');
ALTER TABLE chess_games ADD COLUMN id TEXT GENERATED ALWAYS AS (game_id) VIRTUAL;
ALTER TABLE chess_games ADD COLUMN fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
ALTER TABLE sports_telemetry ADD COLUMN id TEXT GENERATED ALWAYS AS (event_id) VIRTUAL;
ALTER TABLE sports_telemetry ADD COLUMN metric_key TEXT;
ALTER TABLE sports_telemetry ADD COLUMN value REAL;
ALTER TABLE transactions ADD COLUMN item_id TEXT GENERATED ALWAYS AS (artwork_id) VIRTUAL;
-- Amounts are integer minor units, captured at checkout, never supplied by clients.
ALTER TABLE transactions ADD COLUMN amount INTEGER CHECK (amount >= 0);
ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'USDC';
ALTER TABLE transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed'));
UPDATE transactions SET amount = (SELECT price_cents FROM artworks WHERE artworks.id = transactions.artwork_id);

-- Existing migration 0004 seeds the artwork catalog; enrich its workspace metadata.
UPDATE artworks SET category = 'Mixed media' WHERE id IN ('art_002', 'art_004');
INSERT OR IGNORE INTO sports_telemetry (event_id, league, matchup, oracle_consensus_json, metric_key, value)
VALUES ('seed-heart-rate', 'TRAINING', 'Sample training session', '{}', 'heart_rate_bpm', 142),
       ('seed-speed', 'TRAINING', 'Sample training session', '{}', 'speed_kmh', 28.4),
       ('seed-recovery', 'TRAINING', 'Sample training session', '{}', 'recovery_percent', 94);

INSERT OR IGNORE INTO artworks (id, artist_id, artist, title, medium, category, dimensions, price_cents, currency, image_url, status)
VALUES ('art_sovereign_001', 'artist_1', 'maxjurreau', 'Sovereign Horizon', 'Digital canvas', 'Digital', '36 x 48 in', 3200, 'DAT', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1400&q=85', 'available');
INSERT OR IGNORE INTO artwork_editions (id, artwork_base_id, edition_number, total_editions, status)
VALUES ('art_sovereign_001:edition:1', 'art_sovereign_001', 1, 1, 'available');
