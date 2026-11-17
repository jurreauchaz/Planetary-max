import { createRequire } from 'node:module';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
import { readFileSync } from 'node:fs';
import { Wallet } from 'ethers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../index';
import { EIP712_DOMAIN, EIP712_TYPES, ORDER_TYPES, RELEASE_TYPES } from '../eip712';
import { hmac } from '../marketplace';
import { executeWalletCheckout, signEscrowApproval, submitEscrowRelease } from '../../src/hooks/useWalletCheckout';
const buyer = new Wallet('0x' + '11'.repeat(32));
const artist = new Wallet('0x' + '22'.repeat(32));
const admin = new Wallet('0x' + '33'.repeat(32));
const secret = 'local-test-secret-'.repeat(3);
let db: any;
let env: any;
let orderId: string;
function statement(sql: string, args: any[] = []): any {
  return { bind: (...values: any[]) => statement(sql, values), first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const result = db.prepare(sql).run(...args); return { meta: { changes: Number(result.changes) } }; } };
}
const post = (path: string, body: unknown, headers = {}) => app.request(`https://market.test${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }, env);
const expiry = () => Math.floor(Date.now() / 1000) + 240;
async function create(overrides: any = {}) {
  const body = { userId: 'buyer', artworkId: 'art_001', editionId: 'art_001:edition:1', nonce: crypto.randomUUID(), deadline: expiry(), ...overrides };
  const signature = await buyer.signTypedData(EIP712_DOMAIN, ORDER_TYPES, { ...body, amountCents: 1800, currency: 'DAT', audience: 'https://market.test' });
  return post('/api/orders/create', { ...body, signature });
}
async function settle(overrides = {}, valid = true) {
  const body = { orderId, paymentId: 'payment-1', amountCents: 1800, currency: 'DAT', status: 'completed', ...overrides };
  const timestamp = String(Math.floor(Date.now() / 1000));
  return post('/api/payments/webhook', body, { 'X-Payment-Timestamp': timestamp, 'X-Payment-Signature': valid ? await hmac(secret, `${timestamp}.${JSON.stringify(body)}`) : '0'.repeat(64) });
}
async function release(signers = [{ userId: 'artist_1', wallet: artist }, { userId: 'buyer', wallet: buyer }], modifications = {}) {
  const deadline = expiry();
  const value = { orderId, artworkId: 'art_001', editionId: 'art_001:edition:1', buyerId: 'buyer', amountCents: 1800, currency: 'DAT', deadline, audience: 'https://market.test', ...modifications };
  const signatures = await Promise.all(signers.map(async signer => ({ userId: signer.userId, signature: await signer.wallet.signTypedData(EIP712_DOMAIN, RELEASE_TYPES, value) })));
  return post('/api/escrow/release', { orderId, deadline, signatures });
}
beforeEach(() => {
  db?.close(); db = new DatabaseSync(':memory:');
  db.exec(readFileSync('schema.sql', 'utf8'));
  db.prepare("UPDATE users SET public_key = ? WHERE id = 'artist_1'").run(artist.address);
  for (const [id, wallet, role] of [['buyer', buyer, 'user'], ['admin', admin, 'admin']] as const) db.prepare('INSERT INTO users(id, username, password_hash, role, public_key) VALUES (?, ?, ?, ?, ?)').run(id, id, 'disabled-login', role, wallet.address);
  env = { DB: { prepare: statement, batch: async (statements: any[]) => {
    db.exec('BEGIN'); try { const results = []; for (const stmt of statements) results.push(await stmt.run()); db.exec('COMMIT'); return results; }
    catch (e) { db.exec('ROLLBACK'); throw e; }
  } }, PAYMENT_WEBHOOK_SECRET: secret, PROVENANCE_SECRET: secret };
});
describe('signed marketplace orders and settlement', () => {
  it('exposes the supplied registration domain', () => { expect(EIP712_DOMAIN.chainId).toBe(1); expect(EIP712_TYPES.RegisterKey).toHaveLength(2); });
  it('creates a pending reservation at the D1 price and rejects forged identities', async () => {
    const denied = await create({ userId: 'artist_1' }); expect(denied.status).toBe(401);
    const response = await create(); expect(response.status).toBe(201);
    const body = await response.json(); orderId = body.orderId;
    expect(body.amount_cents).toBe(1800); expect(body.payment_status).toBe('pending');
    expect((db.prepare('SELECT status FROM artwork_editions WHERE id = ?').get('art_001:edition:1') as any).status).toBe('reserved');
    expect(db.prepare('SELECT * FROM provenance_certificates').all()).toHaveLength(0);
  });
  it('rejects altered HMACs and mismatched amounts, and processes retries once', async () => {
    orderId = (await (await create()).json()).orderId;
    expect((await settle({}, false)).status).toBe(401);
    expect((await settle({ amountCents: 1 })).status).toBe(409);
    expect((await settle()).status).toBe(200); expect((await settle()).status).toBe(200);
    expect(db.prepare('SELECT * FROM marketplace_payment_receipts').all()).toHaveLength(1);
    expect(db.prepare('SELECT * FROM provenance_certificates').all()).toHaveLength(0);
  });
  it.each(['buyer', 'admin'])('requires settled payment and Artist plus %s for atomic release', async role => {
    orderId = (await (await create()).json()).orderId;
    expect((await release()).status).toBe(409); await settle();
    expect((await release(undefined, { amountCents: 1 })).status).toBe(403);
    const second = role === 'buyer' ? { userId: 'buyer', wallet: buyer } : { userId: 'admin', wallet: admin };
    const result = await release([{ userId: 'artist_1', wallet: artist }, second]);
    expect(result.status).toBe(200);
    expect(db.prepare('SELECT * FROM provenance_certificates').all()).toHaveLength(1);
    expect(db.prepare('SELECT * FROM escrow_signatures').all()).toHaveLength(2);
    expect((await release()).status).toBe(409);
  });
  it('accepts and records all three authorized approvals', async () => {
    orderId = (await (await create()).json()).orderId; await settle();
    const response = await release([{ userId: 'artist_1', wallet: artist }, { userId: 'buyer', wallet: buyer }, { userId: 'admin', wallet: admin }]);
    expect(response.status).toBe(200);
    expect((await response.json()).payment_status).toBe('completed');
    expect(db.prepare('SELECT signer_role FROM escrow_signatures ORDER BY signer_role').all()).toEqual([{ signer_role: 'admin' }, { signer_role: 'artist' }, { signer_role: 'buyer' }]);
    expect(db.prepare('SELECT * FROM provenance_certificates').all()).toHaveLength(1);
  });
  it('rejects an unauthorized or duplicate extra approval without writes', async () => {
    orderId = (await (await create()).json()).orderId; await settle();
    db.prepare("UPDATE users SET role = 'user' WHERE id = 'admin'").run();
    expect((await release([{ userId: 'artist_1', wallet: artist }, { userId: 'buyer', wallet: buyer }, { userId: 'admin', wallet: admin }])).status).toBe(403);
    expect((await release([{ userId: 'artist_1', wallet: artist }, { userId: 'buyer', wallet: buyer }, { userId: 'buyer', wallet: buyer }])).status).toBe(403);
    expect(db.prepare('SELECT * FROM provenance_certificates').all()).toHaveLength(0);
    expect(db.prepare('SELECT * FROM escrow_signatures').all()).toHaveLength(0);
  });
  it('rechecks an additional admin role at commit even when the first two form a quorum', async () => {
    orderId = (await (await create()).json()).orderId; await settle();
    const batch = env.DB.batch;
    env.DB.batch = (statements: any[]) => {
      db.prepare("UPDATE users SET role = 'user' WHERE id = 'admin'").run();
      return batch(statements);
    };
    expect((await release([{ userId: 'artist_1', wallet: artist }, { userId: 'buyer', wallet: buyer }, { userId: 'admin', wallet: admin }])).status).toBe(409);
    expect(db.prepare('SELECT * FROM provenance_certificates').all()).toHaveLength(0);
    expect(db.prepare('SELECT * FROM escrow_signatures').all()).toHaveLength(0);
  });
  it('returns 404 for a missing order and rejects fewer than two approvals', async () => {
    orderId = 'missing-order';
    expect((await release()).status).toBe(404);
    expect((await release([{ userId: 'artist_1', wallet: artist }])).status).toBe(400);
  });
  it('rejects a quorum without the artist or with one key registered twice', async () => {
    orderId = (await (await create()).json()).orderId; await settle();
    expect((await release([{ userId: 'buyer', wallet: buyer }, { userId: 'admin', wallet: admin }])).status).toBe(403);
    db.prepare("UPDATE users SET public_key = ? WHERE id = 'artist_1'").run(buyer.address);
    expect((await release([{ userId: 'artist_1', wallet: buyer }, { userId: 'buyer', wallet: buyer }])).status).toBe(403);
  });
  it('rejects expired requests and reuse of a buyer nonce', async () => {
    expect((await create({ deadline: Math.floor(Date.now() / 1000) - 1 })).status).toBe(401);
    const nonce = crypto.randomUUID();
    orderId = (await (await create({ nonce })).json()).orderId;
    db.prepare("UPDATE marketplace_orders SET payment_status = 'cancelled' WHERE id = ?").run(orderId);
    db.prepare("UPDATE artwork_editions SET status = 'available' WHERE id = 'art_001:edition:1'").run();
    expect((await create({ nonce })).status).toBe(409);
  });
  it('rejects a payment reference reused for another order', async () => {
    orderId = (await (await create()).json()).orderId; await settle();
    expect((await settle({ orderId: 'another-order' })).status).toBe(409);
    expect((await settle({ currency: 'USDC' })).status).toBe(409);
  });
  it('rechecks signing authority inside the atomic release', async () => {
    orderId = (await (await create()).json()).orderId; await settle();
    const batch = env.DB.batch;
    env.DB.batch = (statements: any[]) => {
      db.prepare("UPDATE users SET status = 'disabled' WHERE id = 'artist_1'").run();
      return batch(statements);
    };
    expect((await release()).status).toBe(409);
    expect(db.prepare('SELECT * FROM provenance_certificates').all()).toHaveLength(0);
    expect(db.prepare('SELECT * FROM escrow_signatures').all()).toHaveLength(0);
  });
  it('prevents the separate USDC fulfillment route from selling a reserved edition', async () => {
    orderId = (await (await create()).json()).orderId;
    env.RPC_URL = 'https://rpc.example.invalid';
    env.USDC_CONTRACT = '0x' + '44'.repeat(20);
    env.TREASURY_WALLET = '0x' + '55'.repeat(20);
    const network = vi.fn(() => { throw new Error('Unexpected provider call'); });
    vi.stubGlobal('fetch', network);
    try {
      const response = await post('/api/checkout/verify-usdc', { artworkId: 'art_001', txHash: '0x' + '66'.repeat(32) });
      expect(response.status).toBe(404);
      expect(network).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
  it('rolls back the whole release when certificate insertion fails', async () => {
    orderId = (await (await create()).json()).orderId; await settle();
    db.exec("CREATE TRIGGER reject_certificate BEFORE INSERT ON provenance_certificates BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
    expect((await release()).status).toBe(503);
    expect((db.prepare('SELECT escrow_release_id FROM marketplace_orders WHERE id = ?').get(orderId) as any).escrow_release_id).toBeNull();
    expect((db.prepare('SELECT status FROM artwork_editions WHERE id = ?').get('art_001:edition:1') as any).status).toBe('reserved');
    expect(db.prepare('SELECT * FROM escrow_signatures').all()).toHaveLength(0);
  });
});


afterEach(() => vi.unstubAllGlobals());
function browser(wallet = buyer, chainId = '0x1', rejected = false) {
  const calls: string[] = [];
  vi.stubGlobal('location', { origin: 'https://market.test' });
  vi.stubGlobal('fetch', async (path: string, init: RequestInit) => { calls.push(path); return app.request(`https://market.test${path}`, init, env); });
  const injected = { request: async ({ method, params }: { method: string; params?: any }) => {
    if (method === 'eth_chainId') return chainId;
    if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [wallet.address];
    if (method === 'eth_signTypedData_v4') {
      if (rejected) throw Object.assign(new Error('User rejected signing'), { code: 4001 });
      const { domain, types, message } = JSON.parse(params[1]);
      delete types.EIP712Domain;
      return wallet.signTypedData(domain, types, message);
    }
    throw new Error(`Unexpected wallet method: ${method}`);
  } };
  return { injected, calls };
}
describe('browser wallet checkout against the real Worker router', () => {
  it('signs server-priced terms, waits for HMAC settlement, then collects two compatible approvals', async () => {
    const { injected } = browser();
    const result = await executeWalletCheckout('buyer', 'art_001', injected);
    orderId = result.orderId;
    expect(result.payment_status).toBe('pending');
    await expect(signEscrowApproval('buyer', orderId, undefined, injected)).rejects.toThrow('Verified payment');
    await settle();
    const first = await signEscrowApproval('buyer', orderId, undefined, injected);
    await expect(submitEscrowRelease(first)).rejects.toThrow('Artist and Buyer/Admin');
    const second = await signEscrowApproval('artist_1', orderId, first, browser(artist).injected);
    expect(second.deadline).toBe(first.deadline);
    const released = await submitEscrowRelease(second);
    expect(released.funds_transferred).toBe(false);
    expect(db.prepare('SELECT * FROM provenance_certificates').all()).toHaveLength(1);
    await expect(submitEscrowRelease(second)).rejects.toThrow('not eligible');
  });
  it('rejects the wrong connected wallet and network before creating an order', async () => {
    await expect(executeWalletCheckout('buyer', 'art_001', browser(artist).injected)).rejects.toThrow('registered');
    await expect(executeWalletCheckout('buyer', 'art_001', browser(buyer, '0x2105').injected)).rejects.toThrow('mainnet');
    expect(db.prepare('SELECT * FROM marketplace_orders').all()).toHaveLength(0);
  });
  it('does not submit orders when the signer rejects or no wallet is available', async () => {
    const { injected, calls } = browser(buyer, '0x1', true);
    await expect(executeWalletCheckout('buyer', 'art_001', injected)).rejects.toThrow();
    vi.stubGlobal('ethereum', undefined);
    await expect(executeWalletCheckout('buyer', 'art_001')).rejects.toThrow('No injected');
    expect(calls).not.toContain('/api/orders/create');
  });
  it('rejects changed audiences and unavailable/unregistered checkout previews', async () => {
    const { injected } = browser();
    await expect(executeWalletCheckout('missing', 'art_001', injected)).rejects.toThrow('registered');
    await expect(executeWalletCheckout('buyer', 'missing', injected)).rejects.toThrow('unavailable');
    vi.stubGlobal('location', { origin: 'https://other.test' });
    await expect(executeWalletCheckout('buyer', 'art_001', injected)).rejects.toThrow('audience');
  });
  it('rejects a different order, expired packet and unauthorized release signer', async () => {
    const { injected } = browser();
    orderId = (await executeWalletCheckout('buyer', 'art_001', injected)).orderId;
    await settle();
    const first = await signEscrowApproval('buyer', orderId, undefined, injected);
    await expect(signEscrowApproval('buyer', 'other', first, injected)).rejects.toThrow('different order');
    await expect(signEscrowApproval('buyer', orderId, { ...first, deadline: 1 }, injected)).rejects.toThrow('expired');
    db.prepare("UPDATE users SET role = 'user' WHERE id = 'admin'").run();
    await expect(signEscrowApproval('admin', orderId, first, browser(admin).injected)).rejects.toThrow('Only the Artist');
    const refreshed = await signEscrowApproval('buyer', orderId, first, injected);
    expect(refreshed.signatures).toHaveLength(1);
  });
});
