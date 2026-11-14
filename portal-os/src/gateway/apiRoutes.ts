import { Hono } from 'hono';
import type { Bindings } from '../index';
import { executeSovereignWaterfall, WaterfallValidationError } from '../finance/waterfall';

export const apiRoutes = new Hono<{ Bindings: Bindings }>();

apiRoutes.get('/v1/dat/:datId', async (c) => {
  const datId = c.req.param('datId');
  const session = c.env.DB.withSession('first-primary');
  const asset = await session.prepare('SELECT * FROM dat_assets WHERE dat_id = ?').bind(datId).first();
  if (!asset) return c.json({ error: 'DAT certificate not found' }, 404);
  const history = await session.prepare(
    'SELECT * FROM dat_provenance_events WHERE dat_id = ? ORDER BY occurred_at ASC'
  ).bind(datId).all();
  return c.json({ asset, provenanceChain: history.results ?? [] });
});

apiRoutes.post('/v1/treasury/ingress', async (c) => {
  const expected = c.env.TREASURY_INGRESS_TOKEN;
  if (!expected) return c.json({ error: 'Treasury ingress authentication is not configured' }, 503);
  if (!constantTimeBearerEqual(c.req.header('Authorization'), expected)) return c.json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try { body = await c.req.json<Record<string, unknown>>(); }
  catch { return c.json({ error: 'Invalid JSON body' }, 400); }

  const domains = ['MAX_ART', 'MAX_CHESS', 'MAX_SPORT', 'MAX_TELECOM', 'API_GATEWAY'];
  if (typeof body.txId !== 'string' || typeof body.sourceDomain !== 'string' || !domains.includes(body.sourceDomain) ||
      typeof body.grossAmountUsd !== 'number' || (body.onchainTxHash !== undefined && typeof body.onchainTxHash !== 'string')) {
    return c.json({ error: 'Expected txId, a supported sourceDomain, grossAmountUsd, and optional onchainTxHash' }, 400);
  }
  const configuredBps = Number(c.env.PERSONAL_LIQUIDITY_BPS || '2500');
  try {
    const waterfall = await executeSovereignWaterfall(c.env.DB, {
      txId: body.txId,
      sourceDomain: body.sourceDomain as 'MAX_ART' | 'MAX_CHESS' | 'MAX_SPORT' | 'MAX_TELECOM' | 'API_GATEWAY',
      grossAmountUsd: body.grossAmountUsd,
      personalSweepBps: configuredBps,
      ...(typeof body.onchainTxHash === 'string' ? { onchainTxHash: body.onchainTxHash } : {}),
    });
    return c.json({ status: 'RECORDED', note: 'Ledger allocation only; no funds were transferred.', waterfall }, 201);
  } catch (error) {
    if (error instanceof WaterfallValidationError) return c.json({ error: error.message }, 400);
    if (String(error).toLowerCase().includes('unique')) return c.json({ error: 'txId has already been recorded' }, 409);
    throw error;
  }
});

apiRoutes.post('/v1/mesh/:key/lock', async (c) => {
  const key = c.req.param('key');
  if (!/^[\w.-]{1,128}$/.test(key)) return c.json({ error: 'Invalid lock key' }, 400);
  const id = c.env.SOVEREIGN_MESH.idFromName(key);
  return c.env.SOVEREIGN_MESH.get(id).fetch(new Request('https://mesh/lock', { method: 'POST' }));
});

apiRoutes.post('/v1/mesh/:key/unlock', async (c) => {
  const key = c.req.param('key');
  if (!/^[\w.-]{1,128}$/.test(key)) return c.json({ error: 'Invalid lock key' }, 400);
  const id = c.env.SOVEREIGN_MESH.idFromName(key);
  return c.env.SOVEREIGN_MESH.get(id).fetch(new Request('https://mesh/unlock', { method: 'POST' }));
});

function constantTimeBearerEqual(header: string | undefined, expected: string): boolean {
  if (!header || !header.startsWith('Bearer ')) return false;
  const actualBytes = new TextEncoder().encode(header.slice(7));
  const expectedBytes = new TextEncoder().encode(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actualBytes.length; i++) mismatch |= actualBytes[i] ^ expectedBytes[i];
  return mismatch === 0;
}
