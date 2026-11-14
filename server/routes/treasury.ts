import { Hono } from 'hono';
import { z } from 'zod';

import type { Bindings } from '../types';
import { verifyNodeSignature } from '../middleware';

const treasuryRouter = new Hono<{ Bindings: Bindings }>();

const WithdrawalSchema = z.object({
  nodeDestination: z.string().trim().min(1).max(100).regex(/^[\w.:-]+$/),
  voucherAmount: z.number().finite().positive().max(1_000_000_000),
}).strict();

// This route records a demo request only. It does not redeem vouchers, release escrow,
// or initiate a transfer. Authenticate requests using a registered node signature.
treasuryRouter.use('/api/v1/treasury/*', verifyNodeSignature);
treasuryRouter.post('/api/v1/treasury/withdraw', async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = WithdrawalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: 'Invalid withdrawal demo request.', details: parsed.error.flatten() }, 400);
  }

  const requestedBy = c.req.header('X-Max-Node-Id');
  if (!requestedBy) return c.json({ success: false, error: 'Verified node identity is required.' }, 401);
  const { nodeDestination, voucherAmount } = parsed.data;
  const id = crypto.randomUUID();
  const createdAt = Date.now();

  try {
    await c.env.DB.prepare(
      `INSERT INTO treasury_withdrawal_demos (id, requested_by, destination_node, display_amount, status, created_at)
       VALUES (?, ?, ?, ?, 'SIMULATED', ?)`
    ).bind(id, requestedBy, nodeDestination, String(voucherAmount), createdAt).run();

    return c.json({
      success: true,
      simulation: true,
      status: 'SIMULATED',
      message: 'Demo request recorded only. No vouchers were redeemed, escrow released, or funds transferred.',
      destination: nodeDestination,
      redeemed_vouchers: String(voucherAmount),
      payout_tx_hash: null,
      request_id: id,
      timestamp: createdAt,
    }, 201);
  } catch (error) {
    console.error('Unable to record treasury withdrawal demo:', error);
    return c.json({ success: false, error: 'Treasury demo request could not be recorded.' }, 503);
  }
});

export default treasuryRouter;
