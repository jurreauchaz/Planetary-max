export const EIP712_DOMAIN = {
  name: 'Planetary-max Sovereign', version: '1', chainId: 1,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};
export const EIP712_TYPES = {
  RegisterKey: [{ name: 'wallet', type: 'address' }, { name: 'nonce', type: 'string' }],
};
// Audience prevents signatures for another deployment from being reused here.
export const ORDER_TYPES = { CreateOrder: [
  { name: 'userId', type: 'string' }, { name: 'artworkId', type: 'string' },
  { name: 'editionId', type: 'string' }, { name: 'amountCents', type: 'uint256' },
  { name: 'currency', type: 'string' }, { name: 'nonce', type: 'string' },
  { name: 'deadline', type: 'uint256' }, { name: 'audience', type: 'string' },
] };
export const RELEASE_TYPES = { ReleaseEscrow: [
  { name: 'orderId', type: 'string' }, { name: 'artworkId', type: 'string' },
  { name: 'editionId', type: 'string' }, { name: 'buyerId', type: 'string' },
  { name: 'amountCents', type: 'uint256' }, { name: 'currency', type: 'string' },
  { name: 'deadline', type: 'uint256' }, { name: 'audience', type: 'string' },
] };
