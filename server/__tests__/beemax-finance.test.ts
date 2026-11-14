import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../middleware', () => ({
  verifyNodeSignature: async (_context: unknown, next: () => Promise<void>) => next(),
}));

import app from '../beemax-finance';

interface VoucherRecord {
  voucher_id: string;
  node_id: string;
  display_amount: string;
  currency: string;
  status: string;
}

function createMockD1(voucher: VoucherRecord | null = null, insertChanges = 1, insertError?: Error) {
  const prepare = vi.fn((query: string) => ({
    bind: vi.fn((..._values: unknown[]) => ({
      first: vi.fn().mockResolvedValue(voucher),
      run: vi.fn().mockImplementation(async () => {
        if (insertError && query.includes('finance_voucher_demo_redemptions')) throw insertError;
        return { success: true, meta: { changes: query.includes('finance_voucher_demo_redemptions') ? insertChanges : 1 } };
      }),
    })),
  }));
  return { prepare, batch: vi.fn(), dump: vi.fn(), exec: vi.fn() };
}

const request = (body: unknown, nodeId = 'node_alpha_1') => app.request(
  '/v1/beemax/voucher/redeem',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Max-Node-Id': nodeId,
    },
    body: JSON.stringify(body),
  },
  { DB: createMockD1() } as never,
);

const activeVoucher: VoucherRecord = {
  voucher_id: 'demo_voucher_123',
  node_id: 'node_alpha_1',
  display_amount: '1000.00',
  currency: 'USDC',
  status: 'SIMULATED',
};

beforeEach(() => vi.clearAllMocks());

describe('BEEMAX demo voucher redemption route', () => {
  it('rejects requests without verified node identity', async () => {
    const res = await app.request('/v1/beemax/voucher/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucherId: 'demo_voucher_123' }),
    }, { DB: createMockD1() } as never);

    expect(res.status).toBe(401);
    expect((await res.json()).success).toBe(false);
  });

  it('returns 400 when voucherId is missing', async () => {
    const res = await request({});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Malformed demo redemption request');
  });

  it('returns 404 if the voucher does not belong to the verified node', async () => {
    const db = createMockD1(null);
    const res = await app.request('/v1/beemax/voucher/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Max-Node-Id': 'node_alpha_1' },
      body: JSON.stringify({ voucherId: 'unknown' }),
    }, { DB: db } as never);

    expect(res.status).toBe(404);
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE voucher_id = ? AND node_id = ?'));
  });

  it('records a simulated redemption for an active demo voucher', async () => {
    const db = createMockD1(activeVoucher);
    const res = await app.request('/v1/beemax/voucher/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Max-Node-Id': 'node_alpha_1' },
      body: JSON.stringify({ voucherId: activeVoucher.voucher_id }),
    }, { DB: db } as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.simulation).toBe(true);
    expect(data.redemption.displayAmount).toBe('1000.00');
    expect(data.redemption.voucherId).toBe(activeVoucher.voucher_id);
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO finance_voucher_demo_redemptions'));
  });

  it('rejects a second or racing redemption when the insert is not applied', async () => {
    const db = createMockD1(activeVoucher, 0);
    const res = await app.request('/v1/beemax/voucher/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Max-Node-Id': 'node_alpha_1' },
      body: JSON.stringify({ voucherId: activeVoucher.voucher_id }),
    }, { DB: db } as never);

    expect(res.status).toBe(409);
    expect((await res.json()).success).toBe(false);
  });

  it('does not claim redemption succeeded when the D1 write fails', async () => {
    const db = createMockD1(activeVoucher, 0, new Error('D1 unavailable'));
    const res = await app.request('/v1/beemax/voucher/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Max-Node-Id': 'node_alpha_1' },
      body: JSON.stringify({ voucherId: activeVoucher.voucher_id }),
    }, { DB: db } as never);

    expect(res.status).toBe(503);
    expect((await res.json()).simulation).toBe(true);
  });
});
