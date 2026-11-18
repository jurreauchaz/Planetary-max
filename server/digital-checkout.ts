import type { Hono } from 'hono';
import { z } from 'zod';
import { verifyMessage } from 'viem';
import { digitalCheckoutMessage } from '../src/shared/checkoutMessage';
import { findPaymentReview, recordPaymentReview, reviewResponse } from './payment-reviews';
import { sha256Hex } from './admin-session';
import { settlementConfigured, verifyBaseTransfer, type SettlementConfig } from './base-settlement';

type CommerceBindings = SettlementConfig & { DB: D1Database };
type Release = { id: string; title: string; price_cents: number; currency: 'USD' | 'USDC'; fulfillment_uri: string | null; metadata_hash: string | null; total_editions: number; sold_count: number; status: string; delivery_protection: string | null };
const payment = z.object({ productId: z.string().min(1).max(100), txHash: z.string().regex(/^0x[\da-fA-F]{64}$/), buyerAddress: z.string().regex(/^0x[\da-fA-F]{40}$/), signature: z.string().regex(/^0x[\da-fA-F]{130}$/) }).strict();
const access = (id: string, token: string) => ({ status: 'confirmed', unlockUrl: `/vault/${encodeURIComponent(id)}?kind=digital&token=${encodeURIComponent(token)}` });
export function registerDigitalCheckout<E extends { Bindings: CommerceBindings }>(app: Hono<E>) {
  app.post('/api/catalog/verify-usdc', async c => {
    c.header('Cache-Control', 'no-store');
    if (c.req.header('Origin') !== new URL(c.req.url).origin) return c.json({ error: 'A same-origin request is required.' }, 403);
    let parsed;
    try { parsed = payment.safeParse(await c.req.json()); } catch { return c.json({ error: 'Send a signed payment verification request.' }, 400); }
    if (!parsed.success) return c.json({ error: 'A release, transaction hash, paying wallet and signature are required.' }, 400);
    const { productId, txHash, buyerAddress, signature } = parsed.data;
    try {
      if (!await verifyMessage({ address: buyerAddress as `0x${string}`, message: digitalCheckoutMessage(new URL(c.req.url).origin, productId, txHash, buyerAddress), signature: signature as `0x${string}` })) return c.json({ error: 'The signature does not match the paying wallet.' }, 403);
    } catch { return c.json({ error: 'Wallet signature verification failed.' }, 403); }
    const previousOrder = () => c.env.DB.prepare('SELECT id, access_token FROM digital_orders WHERE product_id=? AND tx_reference=? AND buyer_wallet=?').bind(productId, txHash.toLowerCase(), buyerAddress.toLowerCase()).first<{ id: string; access_token: string }>();
    const loadRelease = () => c.env.DB.prepare("SELECT id,title,price_cents,currency,fulfillment_uri,metadata_hash,total_editions,sold_count,status,delivery_protection FROM digital_products WHERE id=? AND price_cents>0 AND currency IN ('USD','USDC')").bind(productId).first<Release>();
    const available = (r: Release): r is Release & { fulfillment_uri: string; metadata_hash: string } => Boolean(r.status === 'published' && r.sold_count < r.total_editions && r.fulfillment_uri && r.metadata_hash && (r.delivery_protection === 'encrypted' || (r.delivery_protection === 'access_controlled' && r.fulfillment_uri.startsWith('https://'))));
    try {
      const previous = await previousOrder();
      if (previous) return c.json(access(previous.id, previous.access_token));
      const pending = await findPaymentReview(c.env.DB, productId, txHash, buyerAddress);
      if (pending) return c.json(reviewResponse(pending), pending.status === 'refunded' ? 200 : 202);
      if (await c.env.DB.prepare('SELECT tx_reference FROM settlement_claims WHERE tx_reference=?').bind(txHash.toLowerCase()).first()) return c.json({ error: 'This receipt was already used. Recover access with its original release and paying wallet.' }, 409);
      let release = await loadRelease();
      if (!release) return c.json({ error: 'This release is unavailable for direct acquisition.' }, 409);
      if (!settlementConfigured(c.env)) return c.json({ error: 'Direct Base USDC settlement is not configured.' }, 503);
      // Record valid transfers that cannot buy an edition for publisher refund
      // review, including partial payments and transfers for sold-out releases.
      const verified = await verifyBaseTransfer(c.env, txHash, buyerAddress, 0);
      if ('status' in verified) return c.json(verified.body, verified.status);
      const offer = { ...release };
      for (let attempt = 0; attempt < 4; attempt++) {
        const unchanged = release && ['title','price_cents','currency','fulfillment_uri','metadata_hash','total_editions','delivery_protection'].every(key => release![key as keyof Release] === offer[key as keyof Release]);
        if (!release || !unchanged || !available(release) || BigInt(verified.amountUnits) < BigInt(release.price_cents) * 10_000n) break;
        const id = crypto.randomUUID(); const token = crypto.randomUUID(); const issuedAt = new Date().toISOString();
        const certificatePayload = JSON.stringify({ protocol: 'MAX-DIRECT-USDC-v1', orderId: id, productId, buyer: buyerAddress.toLowerCase(), chainId: 8453, txHash: txHash.toLowerCase(), amountCents: release.price_cents, currency: release.currency, metadataHash: release.metadata_hash, edition: release.sold_count + 1, totalEditions: release.total_editions, issuedAt });
        const certificate = await sha256Hex(certificatePayload);
        await c.env.DB.prepare(`INSERT INTO digital_orders (id,product_id,buyer_wallet,amount_cents,currency,tx_reference,edition_number,total_editions,title,metadata_hash,fulfillment_uri,access_token,certificate_hash,certificate_payload,created_at)
          SELECT ?,id,?,price_cents,currency,?,sold_count+1,total_editions,title,metadata_hash,fulfillment_uri,?,?,?,? FROM digital_products
          WHERE id=? AND status='published' AND price_cents=? AND currency=? AND sold_count=? AND total_editions=? AND metadata_hash=? AND fulfillment_uri=? AND title=? AND delivery_protection=? AND sold_count<total_editions`)
          .bind(id, buyerAddress.toLowerCase(), txHash.toLowerCase(), token, certificate, certificatePayload, issuedAt, productId, release.price_cents, release.currency, release.sold_count, release.total_editions, release.metadata_hash, release.fulfillment_uri, release.title, release.delivery_protection).run();
        // D1 metadata can count trigger writes; identify the committed order.
        if (await c.env.DB.prepare('SELECT id FROM digital_orders WHERE id=?').bind(id).first()) return c.json(access(id, token));
        const won = await previousOrder();
        if (won) return c.json(access(won.id, won.access_token));
        release = await loadRelease();
      }
      const review = await recordPaymentReview(c.env, productId, txHash, buyerAddress, verified.amountUnits, 'Edition unavailable, listing changed, or amount insufficient');
      return c.json(reviewResponse(review), 202);
    } catch (error) {
      // Concurrent retries may already have committed this exact acquisition or
      // refund case. Recover it without requiring another payment.
      try {
        const won = await previousOrder(); if (won) return c.json(access(won.id, won.access_token));
        const pending = await findPaymentReview(c.env.DB, productId, txHash, buyerAddress);
        if (pending) return c.json(reviewResponse(pending), pending.status === 'refunded' ? 200 : 202);
      } catch { /* Preserve the retryable failure below. */ }
      if (/UNIQUE constraint|PRIMARY KEY|constraint failed/i.test(String(error))) return c.json({ error: 'This receipt was already used. Recover access with its original release and paying wallet.' }, 409);
      return c.json({ error: 'Direct acquisition could not be verified. Try again with the same transaction; do not send another payment.' }, 503);
    }
  });
  app.get('/api/catalog/orders/:id/unlock', async c => {
    c.header('Cache-Control', 'no-store'); c.header('Referrer-Policy', 'no-referrer');
    const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token || token.length > 200) return c.json({ error: 'A collector access token is required.' }, 401);
    try {
      const order = await c.env.DB.prepare('SELECT id,title,fulfillment_uri,metadata_hash,edition_number,total_editions,certificate_hash,certificate_payload,buyer_wallet,tx_reference,created_at FROM digital_orders WHERE id=? AND access_token=?').bind(c.req.param('id'), token).first<Record<string, string | number>>();
      if (!order) return c.json({ error: 'Invalid collector access.' }, 403);
      const uri = String(order.fulfillment_uri);
      return c.json({ ...order, gateway_url: uri.startsWith('ipfs://') ? `https://cloudflare-ipfs.com/ipfs/${uri.slice(7)}` : uri, ipfs_sha256: order.metadata_hash });
    } catch { return c.json({ error: 'Collector delivery is unavailable.' }, 503); }
  });
}
