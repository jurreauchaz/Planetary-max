-- Adapt the supplied Portal-OS1 verification records to the established catalog.
-- Keep text identifiers, artist foreign keys, editions and ISO timestamps.
-- No price was supplied: reserve this sample listing to prevent checkout of an
-- unpriced item. Zero is a catalog sentinel, not an offer to purchase for free.
INSERT OR IGNORE INTO artworks (
  id, artist_id, artist, title, medium, dimensions, price_cents, currency,
  image_url, category, status, created_at
) VALUES (
  'sovereign_genesis_1', 'artist_1', 'MaxJ', 'Sovereign Genesis #1',
  'Digital Art', '', 0, 'DAT',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
  'Digital Art', 'reserved', strftime('%Y-%m-%dT%H:%M:%fZ', 1710000000, 'unixepoch')
);
INSERT OR IGNORE INTO artwork_editions (
  id, artwork_base_id, edition_number, total_editions, status
) VALUES ('sovereign_genesis_1:edition:1', 'sovereign_genesis_1', 1, 1, 'reserved');

-- Demonstration value only; never insert this into the transactions ledger.
INSERT OR IGNORE INTO sports_telemetry (
  event_id, league, matchup, oracle_consensus_json, metric_key, value, updated_at
) VALUES (
  'seed-active-revenue-stream', 'SAMPLE',
  'Sample revenue metric (not verified earnings)', '{}',
  'active_revenue_stream', 100.00,
  strftime('%Y-%m-%dT%H:%M:%fZ', 1710000000, 'unixepoch')
);
