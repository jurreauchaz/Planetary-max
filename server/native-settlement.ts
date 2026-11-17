import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from './types';
import { verifyNodeSignature } from './middleware';

const settlement = new Hono<{ Bindings: Bindings }>();
const Payload = z.object({
  item_id: z.string().trim().min(1).max(100),
  // Match existing ledger accounting: exact integer minor credit units.
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.literal('SOV_CREDIT').default('SOV_CREDIT'),
  actor_id: z.string().min(1).max(100).optional(),
}).strict();
type NativeRecord = { id: number; item_id: string; amount: number; currency: string; actor_id: string; created_at: number };

settlement.post('/api/sovereign/settle', verifyNodeSignature, async (c) => {
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
  const { item_id, amount, currency } = input.data;
  const reference = `native:${actor}:${key}`;
  try {
    // A single conditional INSERT is atomic. The unique reference prevents
    // duplicate ledger entries even when concurrent signed retries race.
    const result = await c.env.DB.prepare(`INSERT INTO transactions
      (item_id, amount, currency, actor_id, status, tx_reference, created_at)
      VALUES (?, ?, ?, ?, 'SETTLED_NATIVE', ?, ?)
      ON CONFLICT(tx_reference) DO NOTHING
      RETURNING id, item_id, amount, currency, actor_id, created_at`)
      .bind(item_id, amount, currency, actor, reference, Date.now()).all<NativeRecord>();
    const record = result.results[0] ?? await c.env.DB.prepare(
      'SELECT id, item_id, amount, currency, actor_id, created_at FROM transactions WHERE tx_reference = ?'
    ).bind(reference).first<NativeRecord>();
    if (!record) throw new Error('Native ledger write returned no record');
    if (record.item_id !== item_id || record.amount !== amount || record.currency !== currency || record.actor_id !== actor) {
      return c.json({ success: false, error: 'Idempotency-Key already belongs to a different transaction.' }, 409);
    }
    return c.json({ success: true, transaction_id: record.id, ledger: 'MAX-SOVEREIGN-EDGELOG',
      settlement: 'DIRECT_ATOMIC_D1', status: 'SETTLED_NATIVE', timestamp: record.created_at,
      currency: record.currency, amount: record.amount, actor_id: record.actor_id,
      funds_transferred: false });
  } catch (error) {
    console.error('Native D1 settlement failed:', error);
    return c.json({ success: false, error: 'Native settlement ledger is unavailable.' }, 503);
  }
});

export default settlement;
