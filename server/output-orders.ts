import { verifyMessage } from 'viem';
import type { Hono } from 'hono';
import { getOutputTier, OUTPUT_TIERS } from '../src/shared/outputTiers';
import { verifyBaseUsdcTransfer, parseUsdcToAtomic } from './verify-base-usdc';

type OrderBindings = {
  DB: D1Database;
  RPC_URL?: string;
  USDC_CONTRACT?: string;
  BASE_CHAIN_ID?: string;
  TREASURY_WALLET?: string;
  BEEMAX_LIMITER?: RateLimit;
};
type OrderApp = { Bindings: OrderBindings };
type OrderRow = {
  order_id: string;
  tenant_id: string;
  tier_code: string;
  output_slug: string;
  quoted_price_usdc: string;
  settlement_status: string;
  delivery_status: string;
  recipient_address: string;
  reinvest_target: string;
};

const ADDRESS = /^0x[\da-fA-F]{40}$/;
const TX_HASH = /^0x[\da-fA-F]{64}$/;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}
function paymentProofMessage(origin: string, orderId: string, txHash: string, wallet: string): string {
  return `MAX output settlement proof\nOrigin: ${origin}\nOrder: ${orderId}\nTransaction: ${txHash.toLowerCase()}\nWallet: ${wallet.toLowerCase()}`;
}

export function registerOutputOrderRoutes(app: Hono<OrderApp>): void {
  app.post('/api/output-orders/quote', async (c) => {
    if (!isSameOrigin(c.req.raw)) return c.json({ error: 'A same-origin request is required.' }, 403);
    let body: { tenant_id?: unknown; tier_code?: unknown };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Send a valid JSON quote request.' }, 400); }
    const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id.trim().toLowerCase() : '';
    const tierCode = typeof body.tier_code === 'string' ? body.tier_code.trim() : '';
    if (!ADDRESS.test(tenantId)) return c.json({ error: 'tenant_id must be the purchasing wallet address.' }, 400);
    const tier = getOutputTier(tierCode);
    if (!tier) return c.json({ error: 'Unknown or unapproved output tier.' }, 400);
    const amount = parseUsdcToAtomic(tier.priceUsdc);
    if (amount === null) return c.json({ error: 'The configured output tier price is invalid.' }, 503);

    const orderId = `ord_${crypto.randomUUID()}`;
    const free = amount === 0n;
    const now = new Date().toISOString();
    try {
      await c.env.DB.prepare(
        `INSERT INTO output_orders (
          order_id, output_title, tier_name, price_usdc, delivery_mode, reinvest_target,
          settlement_mode, tenant_id, tier_code, output_slug, quoted_price_usdc, currency,
          order_status, settlement_status, recipient_address, delivery_status, delivered_at
        ) VALUES (?, ?, ?, ?, 'OUTPUT_ONLY_NO_MODULE', ?, ?, ?, ?, ?, ?, 'BASE_USDC', ?, ?, ?, ?, ?)`
      ).bind(
        orderId, tier.outputTitle, tier.tierLabel, tier.priceUsdc, tier.reinvestTarget,
        free ? 'FREE_PREVIEW' : 'BASE_USDC_OPT_IN', tenantId, tier.id, tier.outputSlug,
        tier.priceUsdc, free ? 'completed_free_preview' : 'quote_created',
        free ? 'free_preview' : 'unpaid',
        free ? '' : (c.env.TREASURY_WALLET || '').toLowerCase(),
        free ? 'delivered_preview' : 'locked', free ? now : null,
      ).run();
    } catch (error) {
      console.error('Unable to create output quote:', error);
      return c.json({ error: 'Output quote could not be stored. Confirm the output-order migration is applied.' }, 503);
    }

    return c.json({
      ok: true,
      order_id: orderId,
      tier_code: tier.id,
      output_title: tier.outputTitle,
      quoted_price_usdc: tier.priceUsdc,
      currency: 'BASE_USDC',
      chain_id: 8453,
      usdc_contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      recipient_address: free ? null : (c.env.TREASURY_WALLET || null),
      is_free_preview: free,
      delivery_policy: 'OUTPUT_ONLY_NO_MODULE',
      ...(free ? { output: tier.deliverableSummary } : { payment_required: true }),
    }, 201);
  });

  app.post('/api/output-orders/verify-settlement', async (c) => {
    if (!isSameOrigin(c.req.raw)) return c.json({ error: 'A same-origin request is required.' }, 403);
    let body: { order_id?: unknown; tx_hash?: unknown; payer_address?: unknown; signature?: unknown };
    try { body = await c.req.json(); } catch { return c.json({ error: 'Send a valid settlement request.' }, 400); }
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
    const txHash = typeof body.tx_hash === 'string' ? body.tx_hash.trim() : '';
    const payerAddress = typeof body.payer_address === 'string' ? body.payer_address.trim().toLowerCase() : '';
    const signature = typeof body.signature === 'string' ? body.signature : '';
    if (!orderId || orderId.length > 100 || !TX_HASH.test(txHash) || !ADDRESS.test(payerAddress) || !/^0x[\da-fA-F]{130}$/.test(signature)) {
      return c.json({ error: 'order_id, tx_hash, payer_address and a wallet signature are required.' }, 400);
    }

    const order = await c.env.DB.prepare(
      `SELECT order_id, tenant_id, tier_code, output_slug, quoted_price_usdc,
              settlement_status, delivery_status, recipient_address, reinvest_target
       FROM output_orders WHERE order_id = ? AND tenant_id = ?`
    ).bind(orderId, payerAddress).first<OrderRow>();
    if (!order) return c.json({ error: 'Order not found for this purchasing wallet.' }, 404);
    const tier = getOutputTier(order.tier_code);
    if (!tier || tier.priceUsdc !== order.quoted_price_usdc) return c.json({ error: 'Order tier no longer matches the approved server catalog.' }, 409);

    try {
      const validSignature = await verifyMessage({
        address: payerAddress as `0x${string}`,
        message: paymentProofMessage(new URL(c.req.url).origin, orderId, txHash, payerAddress),
        signature: signature as `0x${string}`,
      });
      if (!validSignature) return c.json({ error: 'Wallet signature does not match the order and transaction.' }, 403);
    } catch { return c.json({ error: 'Wallet signature verification failed.' }, 403); }

    if (order.settlement_status === 'free_preview') return c.json({ error: 'Free previews do not accept payment verification.' }, 409);
    if (order.settlement_status === 'verified_settlement') {
      try {
        const output = await deliverOutput(tier.outputSlug, tier.deliverableSummary);
        await c.env.DB.prepare("UPDATE output_orders SET delivery_status='delivered_output', delivered_at=COALESCE(delivered_at, ?) WHERE order_id=? AND settlement_status='verified_settlement'")
          .bind(new Date().toISOString(), order.order_id).run();
        return c.json({ ok: true, already_verified: true, order_id: order.order_id, delivery_status: 'delivered_output', output });
      } catch {
        return c.json({ error: 'Payment is verified; output delivery is temporarily unavailable. Retry with the same order and transaction.' }, 503);
      }
    }

    const duplicate = await c.env.DB.prepare('SELECT order_id FROM output_orders WHERE tx_hash = ? AND tx_hash != ? LIMIT 1')
      .bind(txHash.toLowerCase(), '').first<{ order_id: string }>();
    if (duplicate) return c.json({ error: 'Transaction hash has already been claimed.' }, 409);

    const chainId = Number(c.env.BASE_CHAIN_ID || '8453');
    const contract = (c.env.USDC_CONTRACT || '').toLowerCase();
    const treasury = (c.env.TREASURY_WALLET || '').toLowerCase();
    if (!c.env.RPC_URL || chainId !== 8453 || contract !== '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' || !ADDRESS.test(treasury)) {
      return c.json({ error: 'Base USDC output settlement is not fully configured.' }, 503);
    }

    let check;
    try {
      check = await verifyBaseUsdcTransfer({
        rpcUrl: c.env.RPC_URL,
        txHash,
        expectedRecipient: order.recipient_address || treasury,
        expectedSender: payerAddress,
        expectedAmountUsdc: order.quoted_price_usdc,
        expectedContract: contract,
        expectedChainId: chainId,
      });
    } catch (error) {
      console.error('Base USDC receipt lookup failed:', error);
      return c.json({ error: 'Base receipt verification is temporarily unavailable. Retry later.' }, 503);
    }
    if (!check.verified) return c.json({ ok: false, verified: false, reason: check.reason }, 402);

    const now = new Date().toISOString();
    const eventId = `evt_${crypto.randomUUID()}`;
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          `UPDATE output_orders
           SET order_status='settlement_verified', settlement_status='verified_settlement',
               tx_hash=?, payer_address=?, verified_at=?, delivery_status='locked'
           WHERE order_id=? AND tenant_id=? AND settlement_status='unpaid' AND tx_hash=''`
        ).bind(check.txHash, payerAddress, now, order.order_id, payerAddress),
        c.env.DB.prepare(
          `INSERT INTO settlement_events (
             event_id, tx_hash, chain_id, rail, source_kind, to_address, amount_usdc,
             escrow_status, reinvest_target, from_address, order_id, token_contract,
             verified_amount_usdc, accounting_bucket, block_number
           ) SELECT ?, ?, ?, 'BASE_USDC', 'output_order', ?, ?, 'settled', ?, ?, ?, ?, ?, 'verified_settlement', ?
           WHERE EXISTS (SELECT 1 FROM output_orders WHERE order_id=? AND tx_hash=? AND settlement_status='verified_settlement')`
        ).bind(
          eventId, check.txHash, check.chainId, check.toAddress || treasury,
          check.matchedAmountUsdc || order.quoted_price_usdc, order.reinvest_target,
          check.fromAddress || payerAddress, order.order_id, check.contract,
          check.matchedAmountUsdc || order.quoted_price_usdc, check.blockNumber || '',
          order.order_id, check.txHash,
        ),
      ]);
    } catch (error) {
      console.error('Unable to atomically record output settlement:', error);
      return c.json({ error: 'Settlement could not be recorded; no output was unlocked.' }, 409);
    }

    const recorded = await c.env.DB.prepare("SELECT order_id FROM output_orders WHERE order_id=? AND settlement_status='verified_settlement' AND tx_hash=?")
      .bind(order.order_id, check.txHash).first<{ order_id: string }>();
    if (!recorded) return c.json({ error: 'Order was settled concurrently or the receipt was already claimed.' }, 409);
    try {
      const output = await deliverOutput(tier.outputSlug, tier.deliverableSummary);
      await c.env.DB.prepare("UPDATE output_orders SET order_status='fulfilled', delivery_status='delivered_output', delivered_at=? WHERE order_id=? AND settlement_status='verified_settlement'")
        .bind(new Date().toISOString(), order.order_id).run();
      return c.json({
        ok: true,
        verified: true,
        order_id: order.order_id,
        tx_hash: check.txHash,
        verified_amount_usdc: check.matchedAmountUsdc,
        reinvest_designation: order.reinvest_target,
        delivery_status: 'delivered_output',
        output,
      });
    } catch {
      return c.json({ error: 'Payment verified and recorded; output delivery is temporarily unavailable. Retry with the same order and transaction.' }, 503);
    }
  });
}

async function deliverOutput(outputSlug: string, approvedOutput: string): Promise<{ output_slug: string; content: string; delivery_policy: string }> {
  // Replace this catalog-backed output with the protected output-generation service
  // when it is implemented. No module source, console access, or client-supplied content is returned.
  if (!outputSlug || !approvedOutput) throw new Error('Output is not configured');
  return { output_slug: outputSlug, content: approvedOutput, delivery_policy: 'OUTPUT_ONLY_NO_MODULE' };
}
