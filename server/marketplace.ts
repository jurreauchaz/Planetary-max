import { Hono } from 'hono';
import { z } from 'zod';
import { computeAddress, getAddress } from 'ethers';
import type { Bindings } from './types';
import { verifySovereignSignature } from './middleware';
import { EIP712_DOMAIN, ORDER_TYPES, RELEASE_TYPES } from './eip712';

const router = new Hono<{ Bindings: Bindings }>();
const id = z.string().regex(/^[\w.:-]{1,100}$/);
const signature = z.string().regex(/^0x[\da-fA-F]{130}$/);
const deadline = z.number().int().positive().safe();
const encoder = new TextEncoder();
const hex = (data: ArrayBuffer) => Array.from(new Uint8Array(data), b => b.toString(16).padStart(2, '0')).join('');
export async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}
function address(key: string | null): string | null {
  try {
    if (!key) return null;
    if (/^0x[\da-fA-F]{40}$/.test(key)) return getAddress(key).toLowerCase();
    if (/^0x(?:[\da-fA-F]{66}|[\da-fA-F]{130})$/.test(key)) return computeAddress(key).toLowerCase();
    return null;
  } catch { return null; }
}
function timely(value: number) {
  const now = Math.floor(Date.now() / 1000);
  return value >= now && value <= now + 300;
}
async function json(c: { req: { text(): Promise<string> } }) {
  const text = await c.req.text();
  if (encoder.encode(text).length > 16_000) throw new Error('Body too large');
  return JSON.parse(text);
}
interface User { id: string; public_key: string | null; role: string }
interface Order {
  id: string; artwork_id: string; buyer_id: string; artist_id: string; edition_id: string;
  edition_number: number; total_editions: number; amount_cents: number; currency: string;
  payment_status: string; escrow_release_id: string | null; escrow_expires_at: string | null;
}
// Read-only signing previews. Identity and settlement are still enforced by the signed write routes.
router.post('/api/orders/prepare', async c => {
  let input;
  try { input = z.object({ userId: id, artworkId: id }).strict().parse(await json(c)); }
  catch { return c.json({ error: 'A registered user and artwork are required.' }, 400); }
  try {
    const user = await c.env.DB.prepare("SELECT id, public_key, role FROM users WHERE id = ? AND status = 'active'").bind(input.userId).first<User>();
    const wallet = address(user?.public_key ?? null);
    if (!wallet) return c.json({ error: 'An active registered signing key is required.' }, 403);
    const item = await c.env.DB.prepare(`SELECT e.id AS editionId, a.price_cents, a.currency FROM artworks a
      JOIN artwork_editions e ON e.artwork_base_id = a.id WHERE a.id = ? AND a.status = 'available'
      AND e.status = 'available' ORDER BY e.edition_number LIMIT 1`).bind(input.artworkId).first<{ editionId: string; price_cents: number; currency: string }>();
    if (!item || !Number.isSafeInteger(item.price_cents) || item.price_cents <= 0) return c.json({ error: 'Edition is unavailable.' }, 409);
    c.header('Cache-Control', 'no-store');
    return c.json({ domain: EIP712_DOMAIN, types: ORDER_TYPES, wallet, value: {
      ...input, editionId: item.editionId, amountCents: item.price_cents, currency: item.currency,
      nonce: crypto.randomUUID(), deadline: Math.floor(Date.now() / 1000) + 240, audience: new URL(c.req.url).origin,
    } });
  } catch { return c.json({ error: 'Signing preview is unavailable.' }, 503); }
});

router.post('/api/escrow/prepare', async c => {
  let input;
  try { input = z.object({ userId: id, orderId: id, deadline: deadline.optional() }).strict().parse(await json(c)); }
  catch { return c.json({ error: 'A registered signer and order are required.' }, 400); }
  const expires = input.deadline ?? Math.floor(Date.now() / 1000) + 240;
  if (!timely(expires)) return c.json({ error: 'Approval packet expired. Start a new packet.' }, 401);
  try {
    const user = await c.env.DB.prepare("SELECT id, public_key, role FROM users WHERE id = ? AND status = 'active'").bind(input.userId).first<User>();
    const wallet = address(user?.public_key ?? null);
    if (!user || !wallet) return c.json({ error: 'An active registered signing key is required.' }, 403);
    const order = await c.env.DB.prepare(`SELECT o.*, a.artist_id FROM marketplace_orders o JOIN artworks a ON a.id = o.artwork_id WHERE o.id = ?`).bind(input.orderId).first<Order>();
    if (!order) return c.json({ error: 'Order not found.' }, 404);
    if (user.id !== order.artist_id && user.id !== order.buyer_id && user.role !== 'admin') return c.json({ error: 'Only the Artist, Buyer or a registered Admin may approve.' }, 403);
    if (order.payment_status !== 'completed' || order.escrow_release_id || (order.escrow_expires_at && !(Date.parse(order.escrow_expires_at) > Date.now()))) return c.json({ error: 'Verified payment and an unreleased, unexpired order are required.' }, 409);
    c.header('Cache-Control', 'no-store');
    return c.json({ domain: EIP712_DOMAIN, types: RELEASE_TYPES, wallet, value: {
      orderId: order.id, artworkId: order.artwork_id, editionId: order.edition_id, buyerId: order.buyer_id,
      amountCents: order.amount_cents, currency: order.currency, deadline: expires, audience: new URL(c.req.url).origin,
    } });
  } catch { return c.json({ error: 'Signing preview is unavailable.' }, 503); }
});
router.on('POST', ['/api/orders/create', '/api/marketplace/orders'], async c => {
  let input;
  try { input = z.object({ userId: id, artworkId: id, editionId: id,
    nonce: z.string().regex(/^[\w-]{16,128}$/), deadline, signature,
  }).strict().parse(await json(c)); } catch { return c.json({ error: 'Invalid signed order request.' }, 400); }
  if (!timely(input.deadline)) return c.json({ error: 'Signature deadline is expired or too far in the future.' }, 401);
  try {
    const user = await c.env.DB.prepare("SELECT id, public_key, role FROM users WHERE id = ? AND status = 'active'").bind(input.userId).first<User>();
    const item = await c.env.DB.prepare(`SELECT a.price_cents, a.currency FROM artworks a JOIN artwork_editions e ON e.artwork_base_id = a.id
      WHERE a.id = ? AND e.id = ? AND e.status = 'available' AND a.status = 'available'`).bind(input.artworkId, input.editionId).first<{ price_cents: number; currency: string }>();
    const wallet = address(user?.public_key ?? null);
    if (!user || !wallet) return c.json({ error: 'An active registered signing key is required.' }, 403);
    if (!item || !Number.isSafeInteger(item.price_cents) || item.price_cents <= 0) return c.json({ error: 'Edition is unavailable.' }, 409);
    const { signature: proof, ...fields } = input;
    const value = { ...fields, amountCents: item.price_cents, currency: item.currency, audience: new URL(c.req.url).origin };
    if (!await verifySovereignSignature(EIP712_DOMAIN, ORDER_TYPES, value, proof, wallet)) return c.json({ error: 'Invalid buyer signature.' }, 401);
    const orderId = `order_${crypto.randomUUID()}`;
    const result = await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO marketplace_order_nonces(user_id, nonce) VALUES (?, ?)').bind(user.id, input.nonce),
      c.env.DB.prepare(`INSERT INTO marketplace_orders(id, artwork_id, buyer_id, amount_cents, currency, edition_id, edition_number, payment_status)
        SELECT ?, a.id, ?, a.price_cents, a.currency, e.id, e.edition_number, 'pending'
        FROM artworks a JOIN artwork_editions e ON e.artwork_base_id = a.id
        WHERE a.id = ? AND e.id = ? AND e.status = 'available' AND a.status = 'available' AND a.price_cents = ? AND a.currency = ?
        AND EXISTS(SELECT 1 FROM users WHERE id = ? AND public_key = ? AND status = 'active')`)
        .bind(orderId, user.id, input.artworkId, input.editionId, item.price_cents, item.currency, user.id, user.public_key),
      c.env.DB.prepare(`UPDATE artwork_editions SET status = 'reserved', owner_id = ? WHERE id = ? AND status = 'available'
        AND EXISTS(SELECT 1 FROM marketplace_orders WHERE id = ?)`)
        .bind(user.id, input.editionId, orderId),
    ]);
    if (result[1].meta.changes !== 1 || result[2].meta.changes !== 1) return c.json({ error: 'Edition or registered key changed. Sign a new request.' }, 409);
    return c.json({ success: true, orderId, payment_status: 'pending', amount_cents: item.price_cents, currency: item.currency }, 201);
  } catch (error) {
    if (/unique|constraint/i.test(String(error))) return c.json({ error: 'Order signature was used or the edition is reserved.' }, 409);
    console.error('Order creation failed');
    return c.json({ error: 'Order creation is unavailable.' }, 503);
  }
});

// Provider signs ASCII timestamp + '.' + the exact UTF-8 request body using HMAC-SHA-256.
router.post('/api/payments/webhook', async c => {
  const secret = c.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) return c.json({ error: 'Payment webhook is not configured.' }, 503);
  const timestamp = c.req.header('X-Payment-Timestamp') || '';
  const proof = c.req.header('X-Payment-Signature') || '';
  if (!/^\d{10}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !/^[\da-f]{64}$/i.test(proof)) return c.json({ error: 'Invalid webhook authentication.' }, 401);
  let raw;
  try { raw = await c.req.text(); } catch { return c.json({ error: 'Invalid body.' }, 400); }
  if (encoder.encode(raw).length > 16_000) return c.json({ error: 'Body too large.' }, 413);
  const expected = await hmac(secret, `${timestamp}.${raw}`);
  let mismatch = 0;
  for (let i = 0; i < 64; i++) mismatch |= expected.charCodeAt(i) ^ proof.toLowerCase().charCodeAt(i);
  if (mismatch) return c.json({ error: 'Invalid webhook signature.' }, 401);
  let input;
  try { input = z.object({ orderId: id, paymentId: id, amountCents: z.number().int().positive().safe(), currency: z.string().min(1).max(20), status: z.literal('completed') }).strict().parse(JSON.parse(raw)); }
  catch { return c.json({ error: 'Invalid settlement event.' }, 400); }
  try {
    const prior = await c.env.DB.prepare('SELECT order_id, amount_cents, currency FROM marketplace_payment_receipts WHERE payment_id = ?').bind(input.paymentId).first<{ order_id: string; amount_cents: number; currency: string }>();
    if (prior) return prior.order_id === input.orderId && prior.amount_cents === input.amountCents && prior.currency === input.currency
      ? c.json({ success: true, payment_status: 'completed' }) : c.json({ error: 'Payment reference already used.' }, 409);
    const results = await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO marketplace_payment_receipts(payment_id, order_id, amount_cents, currency, settled_at)
        SELECT ?, id, amount_cents, currency, ? FROM marketplace_orders
        WHERE id = ? AND payment_status = 'pending' AND amount_cents = ? AND currency = ?`)
        .bind(input.paymentId, Date.now(), input.orderId, input.amountCents, input.currency),
      c.env.DB.prepare(`UPDATE marketplace_orders SET payment_status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND payment_status = 'pending' AND EXISTS(SELECT 1 FROM marketplace_payment_receipts WHERE payment_id = ? AND order_id = marketplace_orders.id)`)
        .bind(input.orderId, input.paymentId),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return c.json({ error: 'Order is unavailable or settlement amount/currency does not match.' }, 409);
    return c.json({ success: true, payment_status: 'completed' });
  } catch { return c.json({ error: 'Settlement could not be recorded.' }, 503); }
});

router.post('/api/escrow/release', async c => {
  if (!c.env.PROVENANCE_SECRET || c.env.PROVENANCE_SECRET.length < 32) return c.json({ error: 'Provenance signing is not configured.' }, 503);
  let input;
  try { input = z.object({ orderId: id, deadline, signatures: z.array(z.object({ userId: id, signature }).strict()).min(2).max(10) }).strict().parse(await json(c)); }
  catch { return c.json({ error: 'Between two and ten signed approvals are required.' }, 400); }
  if (!timely(input.deadline)) return c.json({ error: 'Signature deadline is expired or too far in the future.' }, 401);
  try {
    const order = await c.env.DB.prepare(`SELECT o.*, a.artist_id, e.total_editions FROM marketplace_orders o
      JOIN artworks a ON a.id = o.artwork_id JOIN artwork_editions e ON e.id = o.edition_id AND e.artwork_base_id = a.id AND e.edition_number = o.edition_number
      WHERE o.id = ?`).bind(input.orderId).first<Order>();
    if (!order) return c.json({ error: 'Order not found.' }, 404);
    if (order.payment_status !== 'completed' || order.escrow_release_id || (order.escrow_expires_at && !(Date.parse(order.escrow_expires_at) > Date.now()))) return c.json({ error: 'Order is not eligible for release.' }, 409);
    const users: User[] = [];
    const wallets = new Set<string>();
    const value = { orderId: order.id, artworkId: order.artwork_id, editionId: order.edition_id, buyerId: order.buyer_id,
      amountCents: order.amount_cents, currency: order.currency, deadline: input.deadline, audience: new URL(c.req.url).origin };
    for (const approval of input.signatures) {
      const user = await c.env.DB.prepare("SELECT id, public_key, role FROM users WHERE id = ? AND status = 'active'").bind(approval.userId).first<User>();
      const wallet = address(user?.public_key ?? null);
      if (!user || !wallet || wallets.has(wallet) || users.some(u => u.id === user.id) || !await verifySovereignSignature(EIP712_DOMAIN, RELEASE_TYPES, value, approval.signature, wallet)) return c.json({ error: 'Invalid or duplicate registered signer.' }, 403);
      users.push(user); wallets.add(wallet);
    }
    const artist = users.find(u => u.id === order.artist_id);
    const other = users.find(u => u.id !== order.artist_id && (u.id === order.buyer_id || u.role === 'admin'));
    if (!artist || !other) return c.json({ error: 'Artist and a distinct Buyer or Admin must approve.' }, 403);
    if (users.some(user => user.id !== order.artist_id && user.id !== order.buyer_id && user.role !== 'admin')) {
      return c.json({ error: 'Every approval must belong to the Artist, Buyer or a registered Admin.' }, 403);
    }
    const releaseId = crypto.randomUUID();
    const certId = `cert_${crypto.randomUUID()}`;
    const edition = `${order.edition_number}/${order.total_editions}`;
    const certificateHash = await hmac(c.env.PROVENANCE_SECRET, JSON.stringify([order.id, order.artwork_id, order.buyer_id, edition]));
    const guard = 'EXISTS(SELECT 1 FROM marketplace_orders WHERE id = ? AND escrow_release_id = ?)';
    const statements = [c.env.DB.prepare(`UPDATE marketplace_orders SET escrow_release_id = ?, escrow_released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND payment_status = 'completed' AND escrow_release_id IS NULL
      AND artwork_id = ? AND buyer_id = ? AND amount_cents = ? AND currency = ? AND edition_id = ? AND edition_number = ?
      AND (escrow_expires_at IS NULL OR julianday(escrow_expires_at) > julianday('now'))
      AND EXISTS(SELECT 1 FROM marketplace_payment_receipts WHERE order_id = marketplace_orders.id AND amount_cents = marketplace_orders.amount_cents AND currency = marketplace_orders.currency)
      AND EXISTS(SELECT 1 FROM artworks WHERE id = ? AND artist_id = ?)
      AND EXISTS(SELECT 1 FROM artwork_editions WHERE id = ? AND status = 'reserved' AND owner_id = ? AND total_editions = ?)
      ${users.map(() => `AND EXISTS(SELECT 1 FROM users WHERE id = ? AND status = 'active' AND public_key = ?
        AND (id = ? OR id = ? OR role = 'admin'))`).join('\n')}`)
      .bind(releaseId, order.id, order.artwork_id, order.buyer_id, order.amount_cents, order.currency, order.edition_id, order.edition_number,
        order.artwork_id, artist.id, order.edition_id, order.buyer_id, order.total_editions,
        ...users.flatMap(user => [user.id, user.public_key, order.artist_id, order.buyer_id])),
    c.env.DB.prepare(`UPDATE artwork_editions SET status = 'sold', owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND ${guard}`).bind(order.buyer_id, order.edition_id, order.id, releaseId),
    c.env.DB.prepare(`INSERT INTO provenance_certificates(id, order_id, artwork_id, owner_id, edition_string, hash_signature)
      SELECT ?, ?, ?, ?, ?, ? WHERE ${guard}`).bind(certId, order.id, order.artwork_id, order.buyer_id, edition, certificateHash, order.id, releaseId),
    c.env.DB.prepare(`UPDATE artworks SET status = CASE WHEN EXISTS(SELECT 1 FROM artwork_editions WHERE artwork_base_id = artworks.id AND status = 'available') THEN 'available'
      WHEN EXISTS(SELECT 1 FROM artwork_editions WHERE artwork_base_id = artworks.id AND status = 'reserved') THEN 'reserved' ELSE 'sold' END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND ${guard}`).bind(order.artwork_id, order.id, releaseId),
    c.env.DB.prepare(`INSERT INTO beemax_ledger_events(id, entity_type, entity_id, action, payload_hash) SELECT ?, 'marketplace_order', ?, 'ESCROW_RELEASED', ? WHERE ${guard}`).bind(releaseId, order.id, certificateHash, order.id, releaseId),
    ];
    for (const user of users) {
      const proof = input.signatures.find(s => s.userId === user.id)!;
      const digest = hex(await crypto.subtle.digest('SHA-256', encoder.encode(proof.signature)));
      statements.push(c.env.DB.prepare(`INSERT INTO escrow_signatures(id, order_id, signer_id, signer_role, signature_hash) SELECT ?, ?, ?, ?, ? WHERE ${guard}`)
        .bind(crypto.randomUUID(), order.id, user.id, user.id === artist.id ? 'artist' : user.id === order.buyer_id ? 'buyer' : 'admin', digest, order.id, releaseId));
    }
    const results = await c.env.DB.batch(statements);
    if (results[0].meta.changes !== 1) return c.json({ error: 'Order or signing authority changed.' }, 409);
    return c.json({ success: true, orderId: order.id, certificateId: certId, payment_status: 'completed', escrow_status: 'released', funds_transferred: false });
  } catch { return c.json({ error: 'Escrow release could not be recorded.' }, 503); }
});
export default router;
