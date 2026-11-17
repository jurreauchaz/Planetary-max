import { Chess, DEFAULT_POSITION } from '../src/modules/chess/vendor/chess.js';
import { Hono } from 'hono';
import { z } from 'zod';
import { sign, jwt } from 'hono/jwt';

import type { Bindings } from './types';
import beemaxFinanceRouter from './beemax-finance';

type AppBindings = Bindings & {
  RPC_URL?: string;
  USDC_CONTRACT?: string;
  TREASURY_WALLET?: string;
  ADMIN_PASSWORD_HASH?: string;
  JWT_SECRET?: string;
  RESEND_API_KEY?: string;
  PUBLIC_APP_URL?: string;
};
type JwtVariables = { jwtPayload: { role?: string; exp?: number; iat?: number } };
const app = new Hono<{ Bindings: AppBindings; Variables: JwtVariables }>();
const leagues = ['NFL', 'NBA', 'MLB', 'SOCCER', 'MMA'] as const;
const BASE_CHAIN_ID = 8453n;
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const ArtworkSchema = z.object({
  category: z.string().trim().min(1).max(100).default('Digital'),
  creator: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  medium: z.string().trim().min(1).max(100),
  dimensions: z.string().trim().max(100).default(''),
  price_cents: z.number().int().min(1).max(100_000_000),
  image_url: z.string().url().max(2048),
  provenance_hash: z.string().trim().regex(/^(?:0x)?[\da-fA-F]{64}$/, 'Expected a SHA-256 hex digest'),
});
const ChessSchema = z.object({
  gameId: z.string().trim().min(3).max(64),
  whitePlayer: z.string().trim().min(1).max(100),
  blackPlayer: z.string().trim().min(1).max(100),
  openingTag: z.string().trim().max(100).default(''),
  pgnData: z.string().trim().min(3).max(50_000),
});
const SportsSchema = z.object({
  eventId: z.string().trim().min(3).max(64),
  league: z.enum(leagues),
  matchup: z.string().trim().min(1).max(200),
  oracleConsensus: z.object({
    predictedWinner: z.string().trim().min(1).max(100),
    confidenceScore: z.number().finite().min(0).max(100),
    dataSourcesCount: z.number().int().min(1).max(1000),
  }).strict(),
});

function sameOriginWrite(c: { req: { header(name: string): string | undefined; url: string } }) {
  const origin = c.req.header('Origin');
  return Boolean(origin && origin === new URL(c.req.url).origin);
}
async function readJson(c: { req: { header(name: string): string | undefined; json(): Promise<unknown> } }) {
  const contentLength = Number(c.req.header('Content-Length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > 60_000) throw new Error('Request body too large');
  const body = await c.req.json();
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > 60_000) throw new Error('Request body too large');
  return body;
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function getJwtSecret(env: AppBindings) { return env.JWT_SECRET || env.ADMIN_PASSWORD_HASH || ''; }
async function verifyPassword(input: string, expected: string): Promise<boolean> {
  if (!/^[\da-f]{64}$/i.test(expected)) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  let mismatch = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) mismatch |= actual.charCodeAt(i) ^ (expected.toLowerCase().charCodeAt(i) || 0);
  return mismatch === 0;
}

app.get('/api/status', (c) => c.json({
  status: 'nominal', system: 'Portal-OS1', sovereignEngine: 'MAX-SOVEREIGN',
  environment: c.env.ENVIRONMENT || 'production',
  protocol: c.env.PROTOCOL_VERSION || 'DAT-JURREAUISM-v1',
  timestamp: new Date().toISOString(),
}));

// Public gallery catalog. Never expose fulfillment locations, purchase tokens, or collector information.
app.get('/api/artworks', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT a.id, a.artist_id, a.title, u.username AS artist_name,
              ap.bio, ap.portfolio_url, a.medium, a.dimensions, a.price_cents,
              a.image_url, a.status, a.currency, a.category, a.created_at,
              COALESCE(NULLIF(a.artist, ''), u.username) AS artist, a.metadata_hash AS provenance_hash
       FROM artworks a JOIN users u ON u.id = a.artist_id
       LEFT JOIN artist_profiles ap ON ap.user_id = a.artist_id
       ORDER BY a.created_at DESC LIMIT 100`
    ).all();
    return c.json({ success: true, artworks: results ?? [] });
  } catch (error) {
    console.error('Unable to read artwork catalog:', error);
    return c.json({ error: 'Artwork catalog is unavailable. Apply the D1 migrations.' }, 503);
  }
});

// Create a listing (same-origin only; creator must already exist).
app.post('/api/artworks', async (c) => {
  if (!sameOriginWrite(c)) return c.json({ success: false, error: 'A same-origin request is required.' }, 403);
  let parsed;
  try { parsed = ArtworkSchema.safeParse(await readJson(c)); } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Invalid JSON body.' }, 400);
  }
  if (!parsed.success) return c.json({ success: false, error: 'Invalid artwork data.', details: parsed.error.flatten() }, 400);
  const input = parsed.data;
  try {
    const creator = await c.env.DB.prepare('SELECT id FROM users WHERE id = ? OR username = ? LIMIT 1').bind(input.creator, input.creator).first<{ id: string }>();
    if (!creator) return c.json({ success: false, error: 'Creator account was not found. Use an existing artist account username or ID.' }, 400);
    await c.env.DB.prepare(
      `INSERT INTO artworks (id, artist_id, title, medium, dimensions, price_cents, currency, image_url, status, metadata_hash, artist, category)
       VALUES (?, ?, ?, ?, ?, ?, 'DAT', ?, 'available', ?, ?, ?)`
    ).bind(crypto.randomUUID(), creator.id, input.title, input.medium, input.dimensions, input.price_cents, input.image_url, input.provenance_hash.replace(/^0x/i, '').toLowerCase(), input.creator, input.category).run();
    return c.json({ success: true, message: 'Artwork listed.', artwork: { artist_id: creator.id, title: input.title } }, 201);
  } catch (error) {
    console.error('Unable to save artwork:', error);
    return c.json({ success: false, error: 'Artwork could not be saved to D1.' }, 503);
  }
});

// FEN snapshots are separate records; this endpoint does not verify move history.
app.get('/api/chess/game', async (c) => {
  try {
    const game = await c.env.DB.prepare('SELECT id, fen, status, updated_at FROM chess_games ORDER BY updated_at DESC, rowid DESC LIMIT 1').first();
    return c.json({ success: true, game: game || { fen: DEFAULT_POSITION } });
  } catch { return c.json({ success: false, error: 'Saved game unavailable.' }, 503); }
});
app.post('/api/chess/move', async (c) => {
  if (!sameOriginWrite(c)) return c.json({ success: false, error: 'A same-origin request is required.' }, 403);
  let game: Chess;
  try {
    const { fen } = z.object({ fen: z.string().min(1).max(200) }).strict().parse(await readJson(c));
    game = new Chess(fen);
  } catch { return c.json({ success: false, error: 'Invalid chess position.' }, 400); }
  try {
    const fen = game.fen();
    await c.env.DB.prepare('INSERT INTO chess_games (game_id, white_player, black_player, fen, status) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), 'Local white', 'Local black', fen, game.isGameOver() ? 'completed' : 'active').run();
    return c.json({ success: true, fen });
  } catch { return c.json({ success: false, error: 'Game could not be saved.' }, 503); }
});

app.get('/api/chess/games', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, fen, pgn_data, status, updated_at FROM chess_games ORDER BY updated_at DESC LIMIT 20').all();
    return c.json({ games: results ?? [] });
  } catch { return c.json({ error: 'Saved games unavailable.' }, 503); }
});
app.post('/api/chess/games', async (c) => {
  if (!sameOriginWrite(c)) return c.json({ error: 'A same-origin request is required.' }, 403);
  let pgn: string;
  const game = new Chess();
  try {
    const parsed = z.object({ pgn: z.string().max(50000) }).strict().parse(await readJson(c));
    pgn = parsed.pgn;
    game.loadPgn(pgn);
  } catch { return c.json({ error: 'Invalid chess game.' }, 400); }
  try {
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO chess_games (game_id, white_player, black_player, pgn_data, fen, status) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, 'Local white', 'Local black', pgn, game.fen(), game.isGameOver() ? 'completed' : 'active').run();
    return c.json({ id, fen: game.fen() }, 201);
  } catch { return c.json({ error: 'Game could not be saved.' }, 503); }
});

// Public D1 telemetry includes event records and training metrics.
app.get('/api/telemetry', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, event_id, league, matchup, oracle_consensus_json, metric_key, value, updated_at FROM sports_telemetry ORDER BY updated_at DESC LIMIT 100').all();
    return c.json({ success: true, telemetry: results ?? [] });
  } catch { return c.json({ error: 'Telemetry is unavailable. Apply the D1 migrations.' }, 503); }
});

// This logs purchase intent. Only verified payment can confirm revenue or unlock an asset.
app.post('/api/sovereign/checkout', async (c) => {
  if (!sameOriginWrite(c)) return c.json({ error: 'A same-origin request is required.' }, 403);
  const schema = z.object({ item_id: z.string().trim().min(1).max(100), buyer_email: z.string().email().max(254) }).strict();
  let input;
  try { input = schema.safeParse(await readJson(c)); } catch { return c.json({ error: 'Invalid JSON body.' }, 400); }
  if (!input.success) return c.json({ error: 'An item ID and buyer email are required.' }, 400);
  try {
    const reference = `intent:${crypto.randomUUID()}`;
    const result = await c.env.DB.prepare(`INSERT INTO transactions (artwork_id, item_id, buyer_email, tx_reference, amount, currency, status, created_at)
      SELECT id, id, ?, ?, price_cents, currency, 'pending', ? FROM artworks WHERE id = ? AND status = 'available'`)
      .bind(input.data.buyer_email, reference, Date.now(), input.data.item_id).run();
    if (result.meta.changes !== 1) return c.json({ error: 'Artwork is unavailable.' }, 409);
    return c.json({ transaction: { id: result.meta.last_row_id, reference, status: 'pending' }, message: 'Checkout request recorded. Payment has not been collected.' }, 201);
  } catch { return c.json({ error: 'Checkout is unavailable.' }, 503); }
});

// Token-protected collector asset delivery.
app.get('/api/artworks/:id/unlock', async (c) => {
  const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || c.req.query('token');
  if (!token || token.length > 200) return c.json({ error: 'Missing fulfillment access token' }, 401);
  try {
    const item = await c.env.DB.prepare(
      `SELECT id, title, fulfillment_uri, metadata_hash, buyer_email FROM artworks
       WHERE id = ? AND status = 'sold' AND access_token = ? LIMIT 1`
    ).bind(c.req.param('id'), token).first<{ id: string; title: string; fulfillment_uri: string | null; metadata_hash: string | null; buyer_email: string | null }>();
    if (!item) return c.json({ error: 'Invalid token or unauthorized asset access' }, 403);
    if (!item.fulfillment_uri) return c.json({ error: 'The collector asset is not configured.' }, 503);
    const gatewayUrl = item.fulfillment_uri.startsWith('ipfs://')
      ? `https://cloudflare-ipfs.com/ipfs/${item.fulfillment_uri.slice('ipfs://'.length)}`
      : item.fulfillment_uri;
    return c.json({ id: item.id, title: item.title, fulfillment_uri: item.fulfillment_uri, gateway_url: gatewayUrl, ipfs_sha256: item.metadata_hash, collector: item.buyer_email });
  } catch (error) {
    console.error('Unable to validate collector vault token:', error);
    return c.json({ error: 'Database error during vault validation' }, 500);
  }
});

// Verify USDC settlement against the configured Base RPC receipt. Never trust a client-supplied amount or sender.
app.post('/api/checkout/verify-usdc', async (c) => {
  let body: { artworkId?: string; txHash?: string; buyerAddress?: string; buyerEmail?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const { artworkId, txHash, buyerAddress, buyerEmail } = body;
  if (!artworkId || artworkId.length > 100 || !txHash || !/^0x[\da-fA-F]{64}$/.test(txHash)) {
    return c.json({ error: 'Invalid artworkId or transaction hash format' }, 400);
  }
  if (buyerAddress && !/^0x[\da-fA-F]{40}$/.test(buyerAddress)) return c.json({ error: 'Invalid buyer wallet address' }, 400);
  const email = buyerEmail?.trim();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return c.json({ error: 'Invalid buyer email address' }, 400);
  const { RPC_URL, USDC_CONTRACT, TREASURY_WALLET } = c.env;
  if (!RPC_URL || !USDC_CONTRACT || !TREASURY_WALLET || !/^0x[\da-fA-F]{40}$/.test(USDC_CONTRACT) || !/^0x[\da-fA-F]{40}$/.test(TREASURY_WALLET)) {
    console.error('USDC checkout is missing valid Base RPC/contract/treasury configuration');
    return c.json({ error: 'USDC checkout is not configured' }, 503);
  }

  try {
    const artwork = await c.env.DB.prepare(
      `SELECT id, title, price_cents FROM artworks WHERE id = ? AND status = 'available' LIMIT 1`
    ).bind(artworkId).first<{ id: string; title: string; price_cents: number }>();
    if (!artwork) return c.json({ error: 'Artwork not found or already sold' }, 404);

    const rpc = async (method: string, params: unknown[]) => {
      const response = await fetch(RPC_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (!response.ok) throw new Error(`Base RPC returned HTTP ${response.status}`);
      const data = await response.json() as { result?: unknown; error?: { message?: string } };
      if (data.error) throw new Error(data.error.message || 'Base RPC request failed');
      return data.result;
    };
    const chainId = await rpc('eth_chainId', []) as string;
    if (BigInt(chainId) !== BASE_CHAIN_ID) {
      console.error('Configured USDC RPC is not connected to Base mainnet');
      return c.json({ error: 'Configured RPC is not connected to Base Mainnet' }, 503);
    }
    const receipt = await rpc('eth_getTransactionReceipt', [txHash]) as null | {
      status: string; from: string; blockNumber: string;
      logs: Array<{ address: string; topics: string[]; data: string }>;
    };
    if (!receipt) return c.json({ status: 'pending', message: 'Transaction not yet mined' }, 202);
    if (receipt.status !== '0x1') return c.json({ error: 'On-chain transaction reverted or failed' }, 403);
    const latestBlock = BigInt(await rpc('eth_blockNumber', []) as string);
    if (latestBlock - BigInt(receipt.blockNumber) < 2n) return c.json({ status: 'pending', message: 'Waiting for Base confirmations' }, 202);

    const expectedRecipient = `0x${TREASURY_WALLET.slice(2).toLowerCase().padStart(64, '0')}`;
    const expectedAmount = BigInt(artwork.price_cents) * 10_000n; // USDC has 6 decimals; price_cents is USD cents.
    let verifiedSender: string | undefined;
    for (const log of receipt.logs ?? []) {
      if (log.address.toLowerCase() !== USDC_CONTRACT.toLowerCase() || log.topics.length < 3 || log.topics[0].toLowerCase() !== TRANSFER_EVENT_TOPIC) continue;
      if (log.topics[2].toLowerCase() !== expectedRecipient.toLowerCase() || !/^0x[\da-fA-F]+$/.test(log.data)) continue;
      let amount: bigint;
      try { amount = BigInt(log.data); } catch { continue; }
      if (amount < expectedAmount) continue;
      const sender = `0x${log.topics[1].slice(-40)}`;
      if (buyerAddress && sender.toLowerCase() !== buyerAddress.toLowerCase()) continue;
      verifiedSender = sender;
      break;
    }
    if (!verifiedSender) return c.json({ error: 'No matching USDC transfer from the buyer to the treasury for the required amount' }, 403);

    const txReference = txHash.toLowerCase();
    const accessToken = crypto.randomUUID();
    const resolvedEmail = email || verifiedSender.toLowerCase();
    // D1 batch runs atomically. The conditional INSERT only succeeds after this request wins the available->sold update.
    const results = await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE artworks SET status = 'sold', buyer_email = ?, access_token = ?
         WHERE id = ? AND status = 'available'`
      ).bind(resolvedEmail, accessToken, artworkId),
      c.env.DB.prepare(
        `INSERT INTO transactions (artwork_id, item_id, buyer_email, tx_reference, created_at, amount, currency, status)
         SELECT ?, ?, ?, ?, ?, (SELECT price_cents FROM artworks WHERE id = ?), 'USDC', 'confirmed' WHERE EXISTS (
           SELECT 1 FROM artworks WHERE id = ? AND status = 'sold' AND access_token = ?
         ) AND NOT EXISTS (SELECT 1 FROM transactions WHERE tx_reference = ?)`
      ).bind(artworkId, artworkId, resolvedEmail, txReference, Date.now(), artworkId, artworkId, accessToken, txReference),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) {
      return c.json({ error: 'Artwork was acquired simultaneously or this transaction was already redeemed' }, 409);
    }

    if (c.env.RESEND_API_KEY && email) {
      const appUrl = (c.env.PUBLIC_APP_URL || new URL(c.req.url).origin).replace(/\/$/, '');
      const safeTitle = escapeHtml(artwork.title);
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Storefront <curator@yourdomain.com>', to: [email], subject: `Access Granted: ${artwork.title}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;color:#111"><h2>Acquisition Confirmed</h2><p>Your USDC transaction for <strong>${safeTitle}</strong> has been verified on Base.</p><p><a href="${appUrl}/vault/${encodeURIComponent(artworkId)}?token=${encodeURIComponent(accessToken)}">Open Collector Vault</a></p><p>Transaction Reference: ${txReference}</p></div>`,
          }),
        });
        if (!emailResponse.ok) console.error('Resend rejected checkout receipt:', emailResponse.status);
      } catch (error) { console.error('Failed to dispatch checkout receipt:', error); }
    }
    return c.json({ status: 'confirmed', accessToken, unlockUrl: `/vault/${encodeURIComponent(artworkId)}?token=${encodeURIComponent(accessToken)}` });
  } catch (error) {
    console.error('USDC verification failed:', error);
    return c.json({ error: 'USDC verification failed' }, 500);
  }
});

// MAX Chess and MAX Sports domain records.
app.get('/v1/dat/chess/list', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT game_id, white_player, black_player, opening_tag, pgn_data, status, updated_at FROM chess_games ORDER BY updated_at DESC LIMIT 50').all();
    return c.json({ success: true, games: results ?? [] });
  } catch (error) {
    console.error('Unable to read chess records:', error);
    return c.json({ success: false, error: 'Chess records are unavailable. Apply the D1 migrations.' }, 503);
  }
});
app.post('/v1/dat/chess', async (c) => {
  if (!sameOriginWrite(c)) return c.json({ success: false, error: 'A same-origin request is required.' }, 403);
  let parsed;
  try { parsed = ChessSchema.safeParse(await readJson(c)); } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Invalid JSON body.' }, 400);
  }
  if (!parsed.success) return c.json({ success: false, error: 'Invalid chess record.', details: parsed.error.flatten() }, 400);
  const game = parsed.data;
  try {
    await c.env.DB.prepare(`INSERT INTO chess_games (game_id, white_player, black_player, opening_tag, pgn_data, status) VALUES (?, ?, ?, ?, ?, 'active')`).bind(game.gameId, game.whitePlayer, game.blackPlayer, game.openingTag, game.pgnData).run();
    return c.json({ success: true, game_id: game.gameId }, 201);
  } catch (error) {
    console.error('Unable to save chess record:', error);
    return c.json({ success: false, error: 'Chess record could not be saved. The game ID may already exist.' }, 409);
  }
});
app.get('/v1/dat/sports/list', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT event_id, league, matchup, oracle_consensus_json, updated_at FROM sports_telemetry ORDER BY updated_at DESC LIMIT 50').all<{ event_id: string; league: string; matchup: string; oracle_consensus_json: string; updated_at: string }>();
    const telemetry = (results ?? []).map((row) => {
      let oracle_consensus: unknown = {};
      try { oracle_consensus = JSON.parse(row.oracle_consensus_json); } catch { /* Ignore malformed legacy rows. */ }
      return { event_id: row.event_id, league: row.league, matchup: row.matchup, oracle_consensus, updated_at: row.updated_at };
    });
    return c.json({ success: true, telemetry });
  } catch (error) {
    console.error('Unable to read sports telemetry:', error);
    return c.json({ success: false, error: 'Sports telemetry is unavailable. Apply the D1 migrations.' }, 503);
  }
});
app.post('/v1/dat/sports', async (c) => {
  if (!sameOriginWrite(c)) return c.json({ success: false, error: 'A same-origin request is required.' }, 403);
  let parsed;
  try { parsed = SportsSchema.safeParse(await readJson(c)); } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Invalid JSON body.' }, 400);
  }
  if (!parsed.success) return c.json({ success: false, error: 'Invalid sports telemetry.', details: parsed.error.flatten() }, 400);
  const item = parsed.data;
  try {
    await c.env.DB.prepare('INSERT INTO sports_telemetry (event_id, league, matchup, oracle_consensus_json) VALUES (?, ?, ?, ?)').bind(item.eventId, item.league, item.matchup, JSON.stringify(item.oracleConsensus)).run();
    return c.json({ success: true, event_id: item.eventId }, 201);
  } catch (error) {
    console.error('Unable to save sports telemetry:', error);
    return c.json({ success: false, error: 'Sports telemetry could not be saved. The event ID may already exist.' }, 409);
  }
});

// JWT-protected administrator access and sales ledger.
app.post('/api/admin/login', async (c) => {
  if (!sameOriginWrite(c)) return c.json({ error: 'A same-origin request is required.' }, 403);
  if (!c.env.ADMIN_PASSWORD_HASH || !getJwtSecret(c.env)) return c.json({ error: 'Admin authentication is not configured' }, 503);
  try {
    const body = await c.req.json<{ password?: string }>();
    if (!body.password || !(await verifyPassword(body.password, c.env.ADMIN_PASSWORD_HASH))) return c.json({ error: 'Invalid admin credentials' }, 401);
    const now = Math.floor(Date.now() / 1000);
    return c.json({ token: await sign({ role: 'admin', iat: now, exp: now + 4 * 60 * 60 }, getJwtSecret(c.env), 'HS256') });
  } catch { return c.json({ error: 'Login process failed' }, 400); }
});
app.use('/api/admin/*', async (c, next) => {
  if (!getJwtSecret(c.env)) return c.json({ error: 'Admin authentication is not configured' }, 503);
  return jwt({ secret: getJwtSecret(c.env), alg: 'HS256' })(c, next);
});
app.get('/api/admin/ledger', async (c) => {
  if (c.get('jwtPayload')?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT t.id, t.artwork_id, t.item_id, t.actor_id, a.title, a.price_cents, t.amount, t.currency, t.status, t.buyer_email, t.tx_reference, t.created_at
       FROM transactions t LEFT JOIN artworks a ON t.artwork_id = a.id ORDER BY t.created_at DESC LIMIT 50`
    ).all();
    return c.json({ transactions: results ?? [] });
  } catch (error) {
    console.error('Failed to retrieve checkout ledger:', error);
    return c.json({ error: 'Failed to retrieve ledger' }, 503);
  }
});

app.route('/', beemaxFinanceRouter);
app.notFound((c) => {
  if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/v1/')) return c.json({ error: 'Not found' }, 404);
  return c.env.ASSETS.fetch(c.req.raw);
});
app.onError((error, c) => {
  console.error('Request failed:', error);
  return c.json({ error: 'Internal server error' }, 500);
});

export { NodeRegistryDO } from '../workers/beemax-core/src/registryDo';
export { BEEMAXSecureNodeRegistryDO } from '../workers/beemax-core/src/secureRegistryDo';
export default app;
