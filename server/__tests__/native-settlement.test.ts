import { describe, expect, it, vi } from 'vitest';
vi.mock('../middleware', () => ({ verifyNodeSignature: async (_c: unknown, next: () => Promise<void>) => next() }));
import app from '../native-settlement';

describe('native settlement storage failure', () => {
  it('returns a failure without exposing database details or claiming settlement', async () => {
    const prepare = vi.fn(() => ({ bind: () => ({ all: async () => { throw new Error('private database diagnostics'); } }) }));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await app.request('/api/sovereign/settle', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Max-Node-Id': 'test-node', 'Idempotency-Key': 'test-key-123' },
        body: JSON.stringify({ item_id: 'MAX-FINANCE', amount: 100 }),
      }, { DB: { prepare } } as never);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ success: false, error: 'Native settlement ledger is unavailable.' });
    } finally { errorLog.mockRestore(); }
  });
});
