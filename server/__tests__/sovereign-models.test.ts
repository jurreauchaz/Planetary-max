import { describe, expect, it } from 'vitest';
import { hashTypedData, verifyTypedData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { buildSovereignIntent } from '../../src/sovereign/intent';
import { growthModel } from '../../src/governors/simulator';
import { parseCommand } from '../../src/terminal/parser';
describe('Sovereign typed intent builder', () => {
  const message = { orderId: 'order-1', artworkId: 'art-1', amount: 100n, nonce: 1n, timestamp: 1794988800n };
  it('signs the specified Ethereum domain and binds amount, nonce, order, and timestamp', async () => {
    const account = privateKeyToAccount(`0x${'11'.repeat(32)}`);
    const typed = buildSovereignIntent(message); const signature = await account.signTypedData(typed);
    expect(typed.domain.chainId).toBe(1);
    expect(await verifyTypedData({ ...typed, signature, address: account.address })).toBe(true);
    for (const modified of [{ ...message, amount: 101n }, { ...message, nonce: 2n }, { ...message, orderId: 'order-2' }, { ...message, timestamp: message.timestamp + 1n }]) {
      expect(hashTypedData(buildSovereignIntent(modified))).not.toBe(hashTypedData(typed));
    }
  });
  it('rejects malformed integers and empty identities without performing settlement', () => {
    for (const modified of [{ ...message, amount: -1n }, { ...message, nonce: 2n ** 256n }, { ...message, timestamp: 1 as any }, { ...message, orderId: '' }]) expect(() => buildSovereignIntent(modified)).toThrow();
  });
});
it('bounds scenario calculations and distinguishes tetration from double exponentiation', () => {
  expect(growthModel(2, 4, 'linear')).toBe(8);
  expect(growthModel(2, 4, 'exponential')).toBe(16);
  expect(growthModel(2, 4, 'double-exponential')).toBe(65536);
  expect(growthModel(2, 4, 'tetration')).toBe(65536);
  expect(growthModel(3, 3, 'tetration')).toBe(7625597484987);
  expect(growthModel(3, 3, 'double-exponential')).toBe(7625597484987);
  expect(growthModel(2, 5, 'double-exponential')).toBe(4294967296);
  expect(growthModel(2, 5, 'tetration')).toBeNull();
  expect(growthModel(10, 5, 'tetration')).toBeNull();
  expect(() => growthModel(2, 1000000, 'tetration')).toThrow();
});
it('accepts explicit commands and rejects shell fragments and unknown actions', () => {
  expect(parseCommand(' SYS:STATUS ')).toEqual({ kind: 'request', path: '/api/status' });
  expect(parseCommand('ont:domains')).toEqual({ kind: 'request', path: '/api/admin/runtime' });
  for (const input of ['status; rm -rf /', 'agent:execute', 'gov:release', 'fetch https://other.test']) expect(parseCommand(input).kind).toBe('unknown');
});
