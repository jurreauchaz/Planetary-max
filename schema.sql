-- Planetary-max / Portal-OS1 unified Cloudflare D1 schema.

-- Canonical bootstrap for an EMPTY database, including sample catalog/telemetry.

-- Existing databases must use Wrangler migrations; CREATE IF NOT EXISTS does not upgrade tables.

-- Regenerate: python3 scripts/schema.py --write; verify: npm run db:check.

-- Includes Wrangler migration receipts so future upgrades skip this baseline.

-- Text IDs, roles, amounts in cents, payment fields and constraints match deployed APIs.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS node_telemetry (
  node_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  mesh_region TEXT NOT NULL,
  dat_balance REAL NOT NULL DEFAULT 0.0,
  last_heartbeat INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS planetary_assets (
  asset_id TEXT PRIMARY KEY,
  creator TEXT NOT NULL DEFAULT 'MaxJ',
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  quantum_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mesh_transactions (
  tx_id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  amount REAL NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS qal_nodes (
  node_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  trust_tier TEXT NOT NULL DEFAULT 'STANDARD',
  registered_at INTEGER NOT NULL,
  last_authenticated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS qal_sessions (
  session_id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  auth_token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  FOREIGN KEY (node_id) REFERENCES qal_nodes(node_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qal_sessions_node ON qal_sessions(node_id);

CREATE INDEX IF NOT EXISTS idx_qal_sessions_expiry ON qal_sessions(expires_at);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','operator','admin','auditor','node-agent')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','deleted')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
, email TEXT, password_salt TEXT, display_name TEXT, public_key TEXT, updated_at TEXT);

CREATE TABLE IF NOT EXISTS user_node_permissions (
  user_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operator','admin')),
  PRIMARY KEY (user_id, node_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE INDEX IF NOT EXISTS idx_user_node_permissions_node ON user_node_permissions(node_id);

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, edition_number INTEGER NOT NULL DEFAULT 1 CHECK (edition_number >= 1), total_editions INTEGER NOT NULL DEFAULT 1 CHECK (total_editions >= 1 AND edition_number <= total_editions), currency TEXT NOT NULL DEFAULT 'DAT', metadata_hash TEXT, updated_at TEXT, fulfillment_uri TEXT, buyer_email TEXT, access_token TEXT, artist TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'Digital',
    FOREIGN KEY (artist_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marketplace_orders (
    id TEXT PRIMARY KEY,
    artwork_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, edition_number INTEGER, edition_id TEXT REFERENCES artwork_editions(id) ON DELETE RESTRICT, currency TEXT NOT NULL DEFAULT 'DAT', escrow_expires_at TEXT, updated_at TEXT,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS artwork_editions (
  id TEXT PRIMARY KEY,
  artwork_base_id TEXT NOT NULL,
  edition_number INTEGER NOT NULL CHECK (edition_number >= 1),
  total_editions INTEGER NOT NULL CHECK (total_editions >= 1 AND edition_number <= total_editions),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  owner_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT,
  FOREIGN KEY (artwork_base_id) REFERENCES artworks(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  UNIQUE (artwork_base_id, edition_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_active_artwork_edition
ON marketplace_orders (artwork_id, edition_number)
WHERE edition_number IS NOT NULL AND payment_status NOT IN ('cancelled', 'failed');

CREATE INDEX IF NOT EXISTS idx_artwork_editions_status ON artwork_editions (artwork_base_id, status, edition_number);

CREATE TABLE IF NOT EXISTS provenance_certificates (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  artwork_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  edition_string TEXT NOT NULL,
  hash_signature TEXT NOT NULL,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, protocol_version TEXT NOT NULL DEFAULT 'DAT-JURREAUISM-v1',
  FOREIGN KEY (order_id) REFERENCES marketplace_orders(id),
  FOREIGN KEY (artwork_id) REFERENCES artworks(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_provenance_owner ON provenance_certificates (owner_id, order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_artworks_artist_id ON artworks(artist_id);

CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks(status);

CREATE INDEX IF NOT EXISTS idx_artwork_editions_base_id ON artwork_editions(artwork_base_id);

CREATE INDEX IF NOT EXISTS idx_artwork_editions_owner_id ON artwork_editions(owner_id);

CREATE INDEX IF NOT EXISTS idx_orders_artwork_id ON marketplace_orders(artwork_id);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON marketplace_orders(buyer_id);

CREATE INDEX IF NOT EXISTS idx_orders_status ON marketplace_orders(payment_status);

CREATE TABLE IF NOT EXISTS escrow_signatures (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  signer_id TEXT NOT NULL,
  signer_role TEXT NOT NULL CHECK (signer_role IN ('buyer', 'artist', 'admin')),
  signature_hash TEXT NOT NULL,
  signed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (signer_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (order_id, signer_id)
);

CREATE INDEX IF NOT EXISTS idx_escrow_signatures_order_id ON escrow_signatures(order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provenance_hash ON provenance_certificates(hash_signature);

CREATE INDEX IF NOT EXISTS idx_provenance_artwork_id ON provenance_certificates(artwork_id);

CREATE INDEX IF NOT EXISTS idx_provenance_owner_id ON provenance_certificates(owner_id);

CREATE TABLE IF NOT EXISTS beemax_ledger_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  payload_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_beemax_events_entity ON beemax_ledger_events(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS chess_games (
  game_id TEXT PRIMARY KEY,
  white_player TEXT NOT NULL,
  black_player TEXT NOT NULL,
  pgn_data TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
, opening_tag TEXT NOT NULL DEFAULT '', id TEXT GENERATED ALWAYS AS (game_id) VIRTUAL, fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

CREATE INDEX IF NOT EXISTS idx_chess_games_status_updated
  ON chess_games(status, updated_at);

CREATE TABLE IF NOT EXISTS sports_telemetry (
  event_id TEXT PRIMARY KEY,
  league TEXT NOT NULL,
  matchup TEXT NOT NULL,
  oracle_consensus_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
, id TEXT GENERATED ALWAYS AS (event_id) VIRTUAL, metric_key TEXT, value REAL);

CREATE INDEX IF NOT EXISTS idx_sports_telemetry_league_updated
  ON sports_telemetry(league, updated_at);

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

CREATE TABLE IF NOT EXISTS trusted_nodes (
  node_id TEXT PRIMARY KEY,
  public_key_b64 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS node_signature_nonces (
  node_id TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (node_id, nonce),
  FOREIGN KEY (node_id) REFERENCES trusted_nodes(node_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_node_signature_nonces_expiry ON node_signature_nonces(expires_at);

CREATE TABLE IF NOT EXISTS art_provenance (
  artwork_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'MaxJ',
  image_url TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'DAT',
  proof_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'MINTED' CHECK (status IN ('MINTED', 'LISTED', 'SOLD')),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_art_provenance_status ON art_provenance(status);

CREATE TABLE IF NOT EXISTS chess_escrow_demos (
  escrow_id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL UNIQUE,
  white_player TEXT NOT NULL,
  black_player TEXT NOT NULL,
  display_stake_amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SIMULATED_LOCKED'
    CHECK (status IN ('SIMULATED_LOCKED', 'SIMULATED_SETTLED', 'SIMULATED_CANCELLED')),
  winner TEXT,
  created_at INTEGER NOT NULL,
  settled_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_chess_escrow_demos_match ON chess_escrow_demos(match_id);

CREATE TABLE IF NOT EXISTS finance_voucher_demo_redemptions (
  voucher_id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (voucher_id) REFERENCES finance_voucher_demos(voucher_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_finance_voucher_demo_redemptions_node
  ON finance_voucher_demo_redemptions(node_id, created_at);

CREATE TABLE IF NOT EXISTS zk_vouchers (
  voucher_id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  amount TEXT NOT NULL CHECK (CAST(amount AS REAL) > 0),
  currency TEXT NOT NULL DEFAULT 'USDC' CHECK (currency IN ('USDC', 'USDT')),
  proof_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REDEEMED', 'EXPIRED')),
  created_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  FOREIGN KEY (node_id) REFERENCES trusted_nodes(node_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_zk_vouchers_node_status
  ON zk_vouchers(node_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_artworks_access_token ON artworks(access_token) WHERE access_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS treasury_withdrawal_demos (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL,
  destination_node TEXT NOT NULL,
  display_amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SIMULATED' CHECK (status = 'SIMULATED'),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_treasury_withdrawal_demos_created_at
  ON treasury_withdrawal_demos(created_at);

CREATE TABLE IF NOT EXISTS sovereign_identities (
  identity_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  identity_type TEXT NOT NULL CHECK (identity_type IN ('ROOT', 'ARTISTIC_ALIAS', 'ICV_AGENT', 'CREATOR', 'COLLECTOR')),
  pqc_public_key TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS dat_assets (
  dat_id TEXT PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain IN ('MAX_ART', 'MAX_CHESS', 'MAX_SPORT')),
  asset_type TEXT NOT NULL,
  title TEXT NOT NULL,
  originator_id TEXT NOT NULL REFERENCES sovereign_identities(identity_id),
  current_owner_id TEXT NOT NULL REFERENCES sovereign_identities(identity_id),
  content_hash TEXT NOT NULL UNIQUE,
  artifact_uri TEXT NOT NULL,
  pqc_signature TEXT NOT NULL,
  royalty_bps INTEGER NOT NULL DEFAULT 1000 CHECK (royalty_bps BETWEEN 0 AND 10000),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'VAULTED', 'REVOKED')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS dat_provenance_events (
  event_id TEXT PRIMARY KEY,
  dat_id TEXT NOT NULL REFERENCES dat_assets(dat_id),
  event_type TEXT NOT NULL CHECK (event_type IN ('MINTED', 'VERIFIED', 'LICENSED', 'TRANSFERRED', 'ATTESTED', 'VAULTED')),
  from_identity_id TEXT REFERENCES sovereign_identities(identity_id),
  to_identity_id TEXT NOT NULL REFERENCES sovereign_identities(identity_id),
  prev_event_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL UNIQUE,
  actor_signature TEXT NOT NULL,
  settlement_ref TEXT,
  occurred_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_dat_events_asset ON dat_provenance_events(dat_id, occurred_at ASC);

CREATE INDEX IF NOT EXISTS idx_dat_domain_owner ON dat_assets(domain, current_owner_id);

CREATE TABLE IF NOT EXISTS dat_ext_art (
  dat_id TEXT PRIMARY KEY REFERENCES dat_assets(dat_id) ON DELETE CASCADE,
  medium TEXT NOT NULL,
  dimensions TEXT,
  edition_number INTEGER NOT NULL DEFAULT 1,
  edition_total INTEGER NOT NULL DEFAULT 1,
  doctrine_tag TEXT DEFAULT 'JURREAUISM',
  CHECK (edition_number > 0 AND edition_total >= edition_number)
);

CREATE TABLE IF NOT EXISTS dat_ext_chess (
  dat_id TEXT PRIMARY KEY REFERENCES dat_assets(dat_id) ON DELETE CASCADE,
  white_player_id TEXT NOT NULL,
  black_player_id TEXT NOT NULL,
  eco_code TEXT,
  opening_name TEXT,
  result TEXT NOT NULL CHECK (result IN ('1-0', '0-1', '1/2-1/2', '*')),
  pgn_hash TEXT NOT NULL,
  move_count INTEGER NOT NULL CHECK (move_count >= 0)
);

CREATE TABLE IF NOT EXISTS dat_ext_sports (
  dat_id TEXT PRIMARY KEY REFERENCES dat_assets(dat_id) ON DELETE CASCADE,
  league TEXT NOT NULL CHECK (league IN ('NFL', 'NBA', 'WNBA', 'MLB', 'SOCCER', 'MMA', 'COLLEGIATE', 'ESPORTS')),
  match_external_id TEXT NOT NULL,
  artifact_category TEXT NOT NULL CHECK (artifact_category IN ('PREDICTION_MODEL', 'TELEMETRY_FEED', 'NIL_CONTRACT', 'PERFORMANCE_PROOF')),
  oracle_consensus TEXT NOT NULL,
  season_year INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS treasury_waterfall_ledger (
  tx_id TEXT PRIMARY KEY,
  source_domain TEXT NOT NULL CHECK (source_domain IN ('MAX_ART', 'MAX_CHESS', 'MAX_SPORT', 'MAX_TELECOM', 'API_GATEWAY')),
  gross_amount_usd REAL NOT NULL CHECK (gross_amount_usd >= 0),
  private_sweep_usd REAL NOT NULL CHECK (private_sweep_usd >= 0),
  tax_escrow_usd REAL NOT NULL CHECK (tax_escrow_usd >= 0),
  ops_buffer_usd REAL NOT NULL CHECK (ops_buffer_usd >= 0),
  endowment_usd REAL NOT NULL CHECK (endowment_usd >= 0),
  legal_class TEXT NOT NULL,
  onchain_tx_hash TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CHECK (abs(gross_amount_usd - private_sweep_usd - tax_escrow_usd - ops_buffer_usd - endowment_usd) < 0.011)
);

CREATE INDEX IF NOT EXISTS idx_waterfall_time ON treasury_waterfall_ledger(created_at DESC);

CREATE TABLE IF NOT EXISTS "transactions" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artwork_id TEXT REFERENCES artworks(id) ON DELETE RESTRICT,
  item_id TEXT NOT NULL CHECK (length(trim(item_id)) BETWEEN 1 AND 100),
  buyer_email TEXT,
  tx_reference TEXT NOT NULL UNIQUE,
  amount INTEGER CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USDC',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed', 'SETTLED_NATIVE')),
  created_at INTEGER NOT NULL,
  actor_id TEXT REFERENCES trusted_nodes(node_id) ON DELETE RESTRICT,
  CHECK (
    (status = 'SETTLED_NATIVE' AND actor_id IS NOT NULL AND currency = 'SOV_CREDIT'
      AND typeof(amount) = 'integer' AND amount > 0 AND amount <= 9007199254740991)
    OR
    (status != 'SETTLED_NATIVE' AND artwork_id IS NOT NULL AND buyer_email IS NOT NULL AND item_id = artwork_id)
  )
);

CREATE INDEX IF NOT EXISTS idx_transactions_artwork_id ON transactions(artwork_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_actor ON transactions(actor_id, created_at);

-- Sample records. Artist accounts have no usable login password. Revenue metrics are not confirmed earnings.

INSERT OR IGNORE INTO "users" ("id", "username", "password_hash", "role", "status", "created_at", "email", "password_salt", "display_name", "public_key", "updated_at") VALUES ('artist_1', 'maxjurreau', '!seeded-artist-no-login!', 'user', 'active', (unixepoch() * 1000), NULL, NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO "users" ("id", "username", "password_hash", "role", "status", "created_at", "email", "password_salt", "display_name", "public_key", "updated_at") VALUES ('artist_2', 'lunaquartz', '!seeded-artist-no-login!', 'user', 'active', (unixepoch() * 1000), NULL, NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO "users" ("id", "username", "password_hash", "role", "status", "created_at", "email", "password_salt", "display_name", "public_key", "updated_at") VALUES ('artist_3', 'atlas061', '!seeded-artist-no-login!', 'user', 'active', (unixepoch() * 1000), NULL, NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO "artist_profiles" ("user_id", "bio", "portfolio_url", "verified_status", "created_at") VALUES ('artist_1', 'Conceptual systems architect and fine artist exploring quantum topology, edge-native infrastructure, and symbolic fine-art frameworks.', 'https://github.com/maxijurreau1', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO "artist_profiles" ("user_id", "bio", "portfolio_url", "verified_status", "created_at") VALUES ('artist_2', 'Light-based installations and dream-state digital sculpture for modern interiors.', 'https://example.com', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO "artist_profiles" ("user_id", "bio", "portfolio_url", "verified_status", "created_at") VALUES ('artist_3', 'Speculative minimalism, atmospheric textures, and immersive memory objects.', 'https://example.com', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO "artworks" ("id", "artist_id", "title", "medium", "dimensions", "price_cents", "image_url", "status", "created_at", "edition_number", "total_editions", "currency", "metadata_hash", "updated_at", "fulfillment_uri", "buyer_email", "access_token", "artist", "category") VALUES ('art_001', 'artist_1', 'Signal Bloom', 'Digital print', '36 x 48 in', 1800, 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1400&q=85', 'available', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1, 1, 'DAT', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, NULL, NULL, 'maxjurreau', 'Digital');

INSERT OR IGNORE INTO "artworks" ("id", "artist_id", "title", "medium", "dimensions", "price_cents", "image_url", "status", "created_at", "edition_number", "total_editions", "currency", "metadata_hash", "updated_at", "fulfillment_uri", "buyer_email", "access_token", "artist", "category") VALUES ('art_002', 'artist_1', 'Afterimage Atlas', 'Mixed media', '24 x 36 in', 2400, 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1400&q=85', 'available', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1, 1, 'DAT', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, NULL, NULL, 'maxjurreau', 'Mixed media');

INSERT OR IGNORE INTO "artworks" ("id", "artist_id", "title", "medium", "dimensions", "price_cents", "image_url", "status", "created_at", "edition_number", "total_editions", "currency", "metadata_hash", "updated_at", "fulfillment_uri", "buyer_email", "access_token", "artist", "category") VALUES ('art_003', 'artist_2', 'Lunar Archive', 'Archival pigment print', '30 x 40 in', 2100, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1400&q=85', 'reserved', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1, 1, 'DAT', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, NULL, NULL, 'lunaquartz', 'Digital');

INSERT OR IGNORE INTO "artworks" ("id", "artist_id", "title", "medium", "dimensions", "price_cents", "image_url", "status", "created_at", "edition_number", "total_editions", "currency", "metadata_hash", "updated_at", "fulfillment_uri", "buyer_email", "access_token", "artist", "category") VALUES ('art_004', 'artist_3', 'Static Horizon', 'Acrylic and ink', '22 x 30 in', 1600, 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1400&q=85', 'available', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1, 1, 'DAT', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, NULL, NULL, 'atlas061', 'Mixed media');

INSERT OR IGNORE INTO "artworks" ("id", "artist_id", "title", "medium", "dimensions", "price_cents", "image_url", "status", "created_at", "edition_number", "total_editions", "currency", "metadata_hash", "updated_at", "fulfillment_uri", "buyer_email", "access_token", "artist", "category") VALUES ('art_sovereign_001', 'artist_1', 'Sovereign Horizon', 'Digital canvas', '36 x 48 in', 3200, 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1400&q=85', 'available', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1, 1, 'DAT', NULL, NULL, NULL, NULL, NULL, 'maxjurreau', 'Digital');

INSERT OR IGNORE INTO "artworks" ("id", "artist_id", "title", "medium", "dimensions", "price_cents", "image_url", "status", "created_at", "edition_number", "total_editions", "currency", "metadata_hash", "updated_at", "fulfillment_uri", "buyer_email", "access_token", "artist", "category") VALUES ('sovereign_genesis_1', 'artist_1', 'Sovereign Genesis #1', 'Digital Art', '', 0, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe', 'reserved', '2024-03-09T16:00:00.000Z', 1, 1, 'DAT', NULL, NULL, NULL, NULL, NULL, 'MaxJ', 'Digital Art');

INSERT OR IGNORE INTO "artwork_editions" ("id", "artwork_base_id", "edition_number", "total_editions", "status", "owner_id", "created_at", "updated_at") VALUES ('art_001:edition:1', 'art_001', 1, 1, 'available', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO "artwork_editions" ("id", "artwork_base_id", "edition_number", "total_editions", "status", "owner_id", "created_at", "updated_at") VALUES ('art_002:edition:1', 'art_002', 1, 1, 'available', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO "artwork_editions" ("id", "artwork_base_id", "edition_number", "total_editions", "status", "owner_id", "created_at", "updated_at") VALUES ('art_003:edition:1', 'art_003', 1, 1, 'reserved', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO "artwork_editions" ("id", "artwork_base_id", "edition_number", "total_editions", "status", "owner_id", "created_at", "updated_at") VALUES ('art_004:edition:1', 'art_004', 1, 1, 'available', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO "artwork_editions" ("id", "artwork_base_id", "edition_number", "total_editions", "status", "owner_id", "created_at", "updated_at") VALUES ('art_sovereign_001:edition:1', 'art_sovereign_001', 1, 1, 'available', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);

INSERT OR IGNORE INTO "artwork_editions" ("id", "artwork_base_id", "edition_number", "total_editions", "status", "owner_id", "created_at", "updated_at") VALUES ('sovereign_genesis_1:edition:1', 'sovereign_genesis_1', 1, 1, 'reserved', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);

INSERT OR IGNORE INTO "sports_telemetry" ("event_id", "league", "matchup", "oracle_consensus_json", "updated_at", "metric_key", "value") VALUES ('seed-heart-rate', 'TRAINING', 'Sample training session', '{}', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'heart_rate_bpm', 142.0);

INSERT OR IGNORE INTO "sports_telemetry" ("event_id", "league", "matchup", "oracle_consensus_json", "updated_at", "metric_key", "value") VALUES ('seed-speed', 'TRAINING', 'Sample training session', '{}', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'speed_kmh', 28.4);

INSERT OR IGNORE INTO "sports_telemetry" ("event_id", "league", "matchup", "oracle_consensus_json", "updated_at", "metric_key", "value") VALUES ('seed-recovery', 'TRAINING', 'Sample training session', '{}', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'recovery_percent', 94.0);

INSERT OR IGNORE INTO "sports_telemetry" ("event_id", "league", "matchup", "oracle_consensus_json", "updated_at", "metric_key", "value") VALUES ('seed-active-revenue-stream', 'SAMPLE', 'Sample revenue metric (not verified earnings)', '{}', '2024-03-09T16:00:00.000Z', 'active_revenue_stream', 100.0);

-- Wrangler baseline receipts: only valid when importing into an EMPTY database.

CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0001_initial.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0002_user_auth.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0003_marketplace.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0004_demo_gallery_seed.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0005_limited_editions.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0006_provenance_certificates.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0007_production_sovereign_schema.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0008_chess_sports.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0009_chess_opening_tag.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0010_finance_demos.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0011_node_trust_and_domain_demos.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0012_voucher_redemption_demos.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0013_zk_vouchers.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0014_usdc_checkout.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0015_treasury_withdrawal_demos.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0016_sovereign_workspaces.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0017_portal_verification_seeds.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0018_portal_sovereign_core.sql');

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0019_native_settlement.sql');
