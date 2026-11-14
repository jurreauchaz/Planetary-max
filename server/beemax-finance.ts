import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from './types';
import { verifyNodeSignature } from './middleware';

const beemaxFinanceRouter = new Hono<{ Bindings: Bindings }>();

// Demo ledger only: these endpoints do not issue vouchers, prove anonymity,
// hold funds, provide liquidity, or execute yield strategies.
const VoucherSchema = z.object({
  nodeId: z.string().trim().min(1).max(100).regex(/^[\w.:-]+$/),
  amount: z.string().trim().regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,8})?$/, 'Enter a positive decimal amount for display.'),
  currency: z.enum(['USDC', 'USDT']).default('USDC'),
}).strict();
const ReinvestSchema = z.object({
  sourceModule: z.enum(['MAX-ART', 'MAX-CHESS', 'MAX-SPORTS']),
  yieldAmount: z.string().trim().regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,8})?$/, 'Enter a positive decimal amount for display.'),
}).strict();
const RedeemSchema = z.object({
  voucherId: z.string().trim().min(1).max(100),
}).strict();

async function readJson(c: { req: { header(name: string): string | undefined; json(): Promise<unknown> } }) {
  const contentLength = Number(c.req.header('Content-Length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > 8_000) throw new Error('Request body too large.');
  const body: unknown = await c.req.json();
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > 8_000) throw new Error('Request body too large.');
  return body;
}

beemaxFinanceRouter.use('/v1/beemax/*', verifyNodeSignature);

beemaxFinanceRouter.post('/v1/beemax/voucher/mint', async (c) => {
  let parsed;
  try {
    parsed = VoucherSchema.safeParse(await readJson(c));
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Invalid JSON body.' }, 400);
  }
  if (!parsed.success || Number(parsed.data?.amount) <= 0) {
    return c.json({ success: false, error: 'Invalid demo voucher data.', details: parsed.success ? undefined : parsed.error.flatten() }, 400);
  }

  const { nodeId, amount, currency } = parsed.data;
  const voucherId = crypto.randomUUID();
  const timestamp = Date.now();
  try {
    await c.env.DB.prepare(
      `INSERT INTO finance_voucher_demos (voucher_id, node_id, display_amount, currency, status, created_at)
       VALUES (?, ?, ?, ?, 'SIMULATED', ?)`
    ).bind(voucherId, nodeId, amount, currency, timestamp).run();
    return c.json({
      success: true,
      simulation: true,
      notice: 'Demo record only. This is not a cash voucher, zero-knowledge proof, or redeemable instrument.',
      voucher: { voucherId, nodeId, displayAmount: amount, currency, status: 'SIMULATED', timestamp },
    }, 201);
  } catch (error) {
    console.error('Unable to write finance voucher demo record:', error);
    return c.json({ success: false, error: 'Could not save the demo voucher record.' }, 503);
  }
});

beemaxFinanceRouter.post('/v1/beemax/voucher/redeem', async (c) => {
  let parsed;
  try {
    parsed = RedeemSchema.safeParse(await readJson(c));
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Invalid JSON body.' }, 400);
  }
  if (!parsed.success) {
    return c.json({ success: false, error: 'Malformed demo redemption request.', details: parsed.error.flatten() }, 400);
  }

  const nodeId = c.req.header('X-Max-Node-Id');
  if (!nodeId) return c.json({ success: false, error: 'Unauthorized: missing verified node identity.' }, 401);
  const { voucherId } = parsed.data;

  try {
    const voucher = await c.env.DB.prepare(
      `SELECT voucher_id, node_id, display_amount, currency, status
       FROM finance_voucher_demos WHERE voucher_id = ? AND node_id = ? LIMIT 1`,
    ).bind(voucherId, nodeId).first<{
      voucher_id: string;
      node_id: string;
      display_amount: string;
      currency: string;
      status: string;
    }>();

    if (!voucher) {
      return c.json({ success: false, simulation: true, error: 'Demo voucher not found or not owned by this verified node.' }, 404);
    }
    if (voucher.status !== 'SIMULATED') {
      return c.json({ success: false, simulation: true, error: 'Demo voucher is not available for redemption.' }, 409);
    }

    const settledAt = Date.now();
    const result = await c.env.DB.prepare(
      `INSERT INTO finance_voucher_demo_redemptions (voucher_id, node_id, created_at)
       SELECT ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM finance_voucher_demos
         WHERE voucher_id = ? AND node_id = ? AND status = 'SIMULATED'
       )`,
    ).bind(voucherId, nodeId, settledAt, voucherId, nodeId).run();

    if (result.meta.changes !== 1) {
      return c.json({ success: false, simulation: true, error: 'Demo voucher was already redeemed or is no longer available.' }, 409);
    }

    return c.json({
      success: true,
      simulation: true,
      message: 'Demo voucher redemption recorded. No funds were transferred or settled.',
      redemption: {
        voucherId: voucher.voucher_id,
        displayAmount: voucher.display_amount,
        currency: voucher.currency,
        settledAt,
      },
    });
  } catch (error) {
    console.error('Unable to record demo voucher redemption:', error);
    return c.json({ success: false, simulation: true, error: 'Demo redemption could not be recorded.' }, 503);
  }
});

beemaxFinanceRouter.post('/v1/beemax/yield/reinvest', async (c) => {
  let parsed;
  try {
    parsed = ReinvestSchema.safeParse(await readJson(c));
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Invalid JSON body.' }, 400);
  }
  if (!parsed.success || Number(parsed.data?.yieldAmount) <= 0) {
    return c.json({ success: false, error: 'Invalid demo reinvestment data.', details: parsed.success ? undefined : parsed.error.flatten() }, 400);
  }

  const { sourceModule, yieldAmount } = parsed.data;
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  try {
    await c.env.DB.prepare(
      `INSERT INTO finance_yield_demos (id, source_module, display_amount, created_at)
       VALUES (?, ?, ?, ?)`
    ).bind(id, sourceModule, yieldAmount, timestamp).run();
    return c.json({
      success: true,
      simulation: true,
      message: `Recorded a demo amount of ${yieldAmount} from ${sourceModule}. No yield was generated, moved, or reinvested.`,
      record: { id, sourceModule, displayAmount: yieldAmount, status: 'SIMULATED', timestamp },
    }, 201);
  } catch (error) {
    console.error('Unable to write finance reinvestment demo record:', error);
    return c.json({ success: false, error: 'Could not save the demo reinvestment record.' }, 503);
  }
});

export default beemaxFinanceRouter;
