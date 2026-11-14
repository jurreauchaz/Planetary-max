import { isAlgorithmAvailable } from './agility';

/** Never treats an unimplemented post-quantum verifier as successful. */
export async function verifyEd25519(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
  if (!isAlgorithmAvailable('Ed25519')) return false;
  try {
    const key = await crypto.subtle.importKey('raw', publicKey, { name: 'Ed25519' }, false, ['verify']);
    return crypto.subtle.verify({ name: 'Ed25519' }, key, signature, message);
  } catch { return false; }
}
