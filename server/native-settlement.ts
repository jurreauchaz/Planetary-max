import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from './types';
import { verifyNodeSignature } from './middleware';

const settlement = new Hono<{ Bindings: Bindings }>();
const common = {
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.literal('SOV_CREDIT').default('SOV_CREDIT'),
  actor_id: z.string().min(1).max(100).optional(),
};
const Payload = z.union([z.object({
  item_id: z.string().trim().min(1).max(100),
  ...common,
}).strict(), z.object({
  recipient_id: z.string().trim().min(1).max(100),
  memo: z.string().max(500).optional(),
  ...common,
}).strict()]);
type NativeRecord = { id: number; item_id: string; amount: number; currency: string; actor_id: string; created_at: number; recipient_id: string | null; memo: string | null };

settlement.on('POST', ['/api/sovereign/settle', '/api/sovereign/credit-settle'], verifyNodeSignature, async (c) => {
  const actor = c.req.header('X-Max-Node-Id')!;
  const key = c.req.header('Idempotency-Key');
  if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) {
    return c.json({ success: false, error: 'An Idempotency-Key of 8–128 letters, digits, underscores or hyphens is required.' }, 400);
  }
  let input;
  try {
    const body: unknown = await c.req.json();
    input = Payload.safeParse(body);
  } catch { return c.json({ success: false, error: 'Invalid JSON payload.' }, 400); }
  if (!input.success) return c.json({ success: false, error: 'Invalid sovereign transaction payload. Use positive integer minor units and SOV_CREDIT.' }, 400);
  if (input.data.actor_id && input.data.actor_id !== actor) return c.json({ success: false, error: 'Actor must match the authenticated node.' }, 403);
  const { amount, currency } = input.data;
  const recipient = 'recipient_id' in input.data ? input.data.recipient_id : null;
  const memo = 'recipient_id' in input.data ? input.data.memo ?? null : null;
  const reference = `native:${actor}:${key}`;
  try {
    // Keep item_id within the existing 100-character limit for long identities.
    const digest = recipient === null ? null : await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([actor, recipient])));
    const item_id = 'item_id' in input.data ? input.data.item_id : `transfer:${Array.from(new Uint8Array(digest!), b => b.toString(16).padStart(2, '0')).join('')}`;
    // A single conditional INSERT is atomic. The unique reference prevents
    // duplicate ledger entries even when concurrent signed retries race.
    const result = await c.env.DB.prepare(`INSERT INTO transactions
      (item_id, amount, currency, actor_id, status, tx_reference, created_at, recipient_id, memo)
      VALUES (?, ?, ?, ?, 'SETTLED_NATIVE', ?, ?, ?, ?)
      ON CONFLICT(tx_reference) DO NOTHING
      RETURNING id, item_id, amount, currency, actor_id, created_at, recipient_id, memo`)
      .bind(item_id, amount, currency, actor, reference, Date.now(), recipient, memo).all<NativeRecord>();
    const record = result.results[0] ?? await c.env.DB.prepare(
      'SELECT id, item_id, amount, currency, actor_id, created_at, recipient_id, memo FROM transactions WHERE tx_reference = ?'
    ).bind(reference).first<NativeRecord>();
    if (!record) throw new Error('Native ledger write returned no record');
    if (record.item_id !== item_id || record.amount !== amount || record.currency !== currency || record.actor_id !== actor || record.recipient_id !== recipient || record.memo !== memo) {
      return c.json({ success: false, error: 'Idempotency-Key already belongs to a different transaction.' }, 409);
    }
    return c.json({ success: true, transaction_id: record.id, ledger: 'MAX-SOVEREIGN-EDGELOG',
      settlement: 'DIRECT_ATOMIC_D1', status: 'SETTLED_NATIVE', timestamp: record.created_at,
      currency: record.currency, amount: record.amount, actor_id: record.actor_id,
      funds_transferred: false,
      ...(recipient !== null ? { settlement_id: record.id, sender: record.actor_id, recipient: record.recipient_id, memo: record.memo } : {}) });
  } catch (error) {
    console.error('Native D1 settlement failed:', error);
    return c.json({ success: false, error: 'Native settlement ledger is unavailable.' }, 503);
  }
});

export default settlement;
