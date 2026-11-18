import { isAddress } from 'viem';
// User-supplied EIP-712 specification. No assumption that this address hosts a
// deployed escrow contract. This builder neither submits nor settles payments.
export const sovereignIntentTypes = {
  SovereignIntent: [
    { name: 'orderId', type: 'string' }, { name: 'artworkId', type: 'string' },
    { name: 'amount', type: 'uint256' }, { name: 'nonce', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' },
  ],
} as const;
export const sovereignDomain = {
  name: 'Portal-OS1 Sovereign Escrow', version: '1.0', chainId: 1,
  verifyingContract: '0x5073657261536f7665726569676e436f72653031',
} as const;
export function buildSovereignIntent(message: { orderId: string; artworkId: string; amount: bigint; nonce: bigint; timestamp: bigint }, domain = sovereignDomain) {
  if (!isAddress(domain.verifyingContract) || !Number.isSafeInteger(domain.chainId) || domain.chainId < 1) throw new Error('Invalid intent domain');
  if (!message.orderId.trim() || !message.artworkId.trim() || message.orderId.length > 256 || message.artworkId.length > 256) throw new Error('Order and artwork identifiers are required');
  for (const n of [message.amount, message.nonce, message.timestamp]) if (typeof n !== 'bigint' || n < 0n || n >= 2n ** 256n) throw new Error('Intent values must be uint256 integers');
  return { domain, types: sovereignIntentTypes, primaryType: 'SovereignIntent' as const, message };
}
