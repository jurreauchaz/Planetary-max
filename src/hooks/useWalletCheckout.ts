import { BrowserProvider, type Eip1193Provider } from 'ethers';
import { z } from 'zod';
import { EIP712_DOMAIN, ORDER_TYPES, RELEASE_TYPES } from '../../server/eip712';

const identifier = z.string().regex(/^[\w.:-]{1,100}$/);
const expiry = z.number().int().positive().safe();
const approval = z.object({ userId: identifier, signature: z.string().regex(/^0x[\da-fA-F]{130}$/) }).strict();
export const approvalPacket = z.object({ orderId: identifier, deadline: expiry, signatures: z.array(approval).max(10) }).strict();
export type ApprovalPacket = z.infer<typeof approvalPacket>;
const terms = {
  artworkId: identifier, editionId: identifier, amountCents: z.number().int().positive().safe(),
  currency: z.string().min(1).max(20), deadline: expiry, audience: z.string().url(),
};
const orderTerms = z.object({ ...terms, userId: identifier, nonce: z.string().regex(/^[\w-]{16,128}$/) }).strict();
const releaseTerms = z.object({ ...terms, orderId: identifier, buyerId: identifier }).strict();

async function post<T extends z.ZodTypeAny>(path: string, body: unknown, schema: T): Promise<z.infer<T>> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let data;
  try { data = await response.json(); } catch { throw new Error(`Service returned an invalid response (${response.status}).`); }
  if (!response.ok) {
    const error = z.object({ error: z.string().optional() }).safeParse(data);
    throw new Error(error.success && error.data.error ? error.data.error : `Request failed (${response.status}).`);
  }
  return schema.parse(data);
}
async function connectedSigner(expectedWallet: string, injected?: Eip1193Provider) {
  const ethereum = injected ?? (globalThis as typeof globalThis & { ethereum?: Eip1193Provider }).ethereum;
  if (!ethereum) throw new Error('No injected Web3 wallet found. Open MetaMask or a compatible wallet.');
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  if ((await signer.getAddress()).toLowerCase() !== expectedWallet.toLowerCase()) throw new Error('Connect the wallet registered to this user ID.');
  if ((await provider.getNetwork()).chainId !== BigInt(EIP712_DOMAIN.chainId)) throw new Error(`Switch your wallet to Ethereum mainnet (chain ${EIP712_DOMAIN.chainId}) before signing.`);
  return signer;
}
function checkAudience(audience: string) {
  if (audience !== globalThis.location.origin) throw new Error('Signing audience does not match this site.');
}
export async function executeWalletCheckout(userId: string, artworkId: string, injected?: Eip1193Provider) {
  const prepared = await post('/api/orders/prepare', { userId, artworkId }, z.object({ wallet: z.string().regex(/^0x[\da-fA-F]{40}$/), value: orderTerms }));
  const value = orderTerms.parse(prepared.value);
  checkAudience(value.audience);
  if (value.userId !== userId || value.artworkId !== artworkId) throw new Error('Checkout preview does not match the selected artwork and buyer.');
  const signer = await connectedSigner(prepared.wallet, injected);
  const signature = await signer.signTypedData(EIP712_DOMAIN, ORDER_TYPES, value);
  return post('/api/orders/create', { userId, artworkId, editionId: value.editionId, nonce: value.nonce, deadline: value.deadline, signature }, z.object({ success: z.literal(true), orderId: identifier, payment_status: z.literal('pending'), amount_cents: z.number().int().positive().safe(), currency: z.string() }));
}
export async function signEscrowApproval(userId: string, orderId: string, packet?: ApprovalPacket, injected?: Eip1193Provider): Promise<ApprovalPacket> {
  const prior = packet ? approvalPacket.parse(packet) : undefined;
  if (prior && prior.orderId !== orderId) throw new Error('The approval packet belongs to a different order.');
  const prepared = await post('/api/escrow/prepare', { userId, orderId, ...(prior ? { deadline: prior.deadline } : {}) }, z.object({ wallet: z.string().regex(/^0x[\da-fA-F]{40}$/), value: releaseTerms }));
  const value = releaseTerms.parse(prepared.value);
  checkAudience(value.audience);
  if (value.orderId !== orderId || (prior && value.deadline !== prior.deadline)) throw new Error('Release preview does not match the approval packet.');
  const signer = await connectedSigner(prepared.wallet, injected);
  const signature = await signer.signTypedData(EIP712_DOMAIN, RELEASE_TYPES, value);
  return approvalPacket.parse({ orderId, deadline: value.deadline, signatures: [...(prior?.signatures.filter(s => s.userId !== userId) ?? []), { userId, signature }] });
}
export async function submitEscrowRelease(packet: ApprovalPacket) {
  const body = approvalPacket.parse(packet);
  if (body.signatures.length < 2 || new Set(body.signatures.map(s => s.userId)).size !== body.signatures.length) throw new Error('Collect distinct Artist and Buyer/Admin approvals first.');
  return post('/api/escrow/release', body, z.object({ success: z.literal(true), certificateId: identifier, funds_transferred: z.literal(false) }));
}
