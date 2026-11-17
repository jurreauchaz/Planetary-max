import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { Wallet } from 'ethers';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { dbMiddleware, verifyNodeSignature, verifySovereignSignature } from '../middleware';

describe('typed data signature verification', () => {
  it('accepts the expected signer and rejects altered messages, domains, signers and invalid signatures', async () => {
    const wallet = new Wallet('0x' + '12'.repeat(32));
    const domain = { name: 'Test escrow', version: '1', chainId: 1 };
    const types = { Order: [{ name: 'orderId', type: 'string' }] };
    const value = { orderId: 'order-1' };
    const signature = await wallet.signTypedData(domain, types, value);
    expect(await verifySovereignSignature(domain, types, value, signature, wallet.address.toLowerCase())).toBe(true);
    expect(await verifySovereignSignature(domain, types, { orderId: 'order-2' }, signature, wallet.address)).toBe(false);
    expect(await verifySovereignSignature({ ...domain, chainId: 2 }, types, value, signature, wallet.address)).toBe(false);
    expect(await verifySovereignSignature(domain, types, value, signature, '0x' + 'ab'.repeat(20))).toBe(false);
    expect(await verifySovereignSignature(domain, types, value, 'invalid', wallet.address)).toBe(false);
  });
});

describe('D1 and node authentication middleware', () => {
  it('returns a JSON error for a missing D1 binding', async () => {
    const app = new Hono();
    app.use('*', dbMiddleware);
    app.get('/', c => c.text('ok'));
    const response = await app.request('/', {}, {});
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: 'D1 database binding missing.' });
    expect((await app.request('/', {}, { DB: {} })).status).toBe(200);
  });

  it('continues to verify Ed25519 request signatures and reject replays and changed bodies', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicKeyB64 = publicKey.export({ format: 'jwk' }).x;
    const nonces = new Set<string>();
    const db = {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            return {
              async first() { return sql.includes('trusted_nodes') ? { public_key_b64: publicKeyB64 } : null; },
              async run() {
                if (!sql.startsWith('INSERT OR IGNORE')) return { meta: { changes: 0 } };
                const nonce = String(args[1]);
                if (nonces.has(nonce)) return { meta: { changes: 0 } };
                nonces.add(nonce);
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    };
    const app = new Hono();
    app.post('/settle', verifyNodeSignature, c => c.json({ ok: true }));
    const body = '{"amount":100}';
    const timestamp = String(Date.now());
    const nonce = randomUUID();
    const hash = createHash('sha256').update(body).digest('hex');
    const signature = sign(null, Buffer.from(`${timestamp}\n${nonce}\nPOST\n/settle\n${hash}`), privateKey).toString('base64url');
    const headers = { 'X-Max-Node-Id': 'node-1', 'X-Max-Node-Signature': signature, 'X-Max-Timestamp': timestamp, 'X-Max-Nonce': nonce };
    expect((await app.request('/settle', { method: 'POST', headers, body }, { DB: db })).status).toBe(200);
    expect((await app.request('/settle', { method: 'POST', headers, body }, { DB: db })).status).toBe(409);
    expect((await app.request('/settle', { method: 'POST', headers, body: '{"amount":101}' }, { DB: db })).status).toBe(401);
  });
});
