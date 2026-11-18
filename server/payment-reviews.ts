import type { Hono, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { verifyBaseTransfer, type SettlementConfig } from './base-settlement';
export type ReviewBindings = SettlementConfig & { DB: D1Database };
export type PaymentReview = { id: string; product_id: string; buyer_wallet: string; tx_reference: string; amount_units: string; treasury: string; token_contract: string; status: 'pending_refund' | 'refunded'; refund_tx_reference: string | null };
export function reviewResponse(review: PaymentReview) {
  return { status: review.status, caseId: review.id, amountUnits: review.amount_units, refundTxHash: review.refund_tx_reference,
    message: review.status === 'refunded' ? `Your payment was returned on Base. Refund transaction: ${review.refund_tx_reference}` : `Verified payment recorded for publisher refund review. Case: ${review.id}. Save this reference. The publisher can inspect it in Publishing desk → Payment recovery and return the transfer from its treasury. No refund has been sent yet. Resubmit this transaction with your paying wallet to check progress.` };
}
export async function findPaymentReview(db: D1Database, productId: string, txHash: string, buyer: string) {
  return db.prepare('SELECT * FROM digital_payment_reviews WHERE product_id=? AND tx_reference=? AND buyer_wallet=?').bind(productId, txHash.toLowerCase(), buyer.toLowerCase()).first<PaymentReview>();
}
export async function recordPaymentReview(env: ReviewBindings & Required<SettlementConfig>, productId: string, txHash: string, buyer: string, amountUnits: string, reason: string) {
  const previous = await findPaymentReview(env.DB, productId, txHash, buyer);
  if (previous) return previous;
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO digital_payment_reviews(id,product_id,buyer_wallet,tx_reference,amount_units,treasury,token_contract,reason) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, productId, buyer.toLowerCase(), txHash.toLowerCase(), amountUnits, env.TREASURY_WALLET.toLowerCase(), env.USDC_CONTRACT.toLowerCase(), reason).run();
  return (await findPaymentReview(env.DB, productId, txHash, buyer))!;
}
export function registerPaymentReviews<E extends { Bindings: ReviewBindings }>(app: Hono<E>, requireAdmin: MiddlewareHandler<E>) {
  app.use('/api/admin/payment-reviews', requireAdmin); app.use('/api/admin/payment-reviews/*', requireAdmin);
  app.get('/api/admin/payment-reviews', async c => {
    try { return c.json({ reviews: (await c.env.DB.prepare('SELECT r.*,p.title FROM digital_payment_reviews r JOIN digital_products p ON p.id=r.product_id ORDER BY r.created_at DESC LIMIT 100').all()).results }); }
    catch { return c.json({ error: 'Payment recovery is unavailable.' }, 503); }
  });
  app.post('/api/admin/payment-reviews/:id/refund', async c => {
    let parsed;
    try { parsed = z.object({ txHash: z.string().regex(/^0x[\da-fA-F]{64}$/) }).strict().safeParse(await c.req.json()); } catch { return c.json({ error: 'Enter the refund transaction hash.' }, 400); }
    if (!parsed.success) return c.json({ error: 'Enter a valid refund transaction hash.' }, 400);
    try {
      const review = await c.env.DB.prepare('SELECT * FROM digital_payment_reviews WHERE id=?').bind(c.req.param('id')).first<PaymentReview>();
      if (!review) return c.json({ error: 'Payment review not found.' }, 404);
      if (review.status === 'refunded') return c.json(reviewResponse(review));
      if (!c.env.RPC_URL) return c.json({ error: 'Base RPC is required to verify the refund.' }, 503);
      const proof = await verifyBaseTransfer({ RPC_URL: c.env.RPC_URL, USDC_CONTRACT: review.token_contract, TREASURY_WALLET: review.buyer_wallet }, parsed.data.txHash, review.treasury, 0, review.amount_units);
      if ('status' in proof) return c.json(proof.body, proof.status);
      await c.env.DB.prepare("UPDATE digital_payment_reviews SET status='refunded',refund_tx_reference=? WHERE id=? AND status='pending_refund'").bind(parsed.data.txHash.toLowerCase(), review.id).run();
      const resolved = await c.env.DB.prepare('SELECT * FROM digital_payment_reviews WHERE id=?').bind(review.id).first<PaymentReview>();
      return c.json(reviewResponse(resolved!));
    } catch { return c.json({ error: 'Refund could not be recorded. Confirm that its transaction is unused and returns the full verified amount to the original buyer.' }, 409); }
  });
}
