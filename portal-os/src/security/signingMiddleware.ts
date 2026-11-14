import { createMiddleware } from 'hono/factory';

export interface SovereignSigningKeys {
  ed25519Hex: string;
  mlDsa65Hex: string;
}

interface SigningBindings {
  MASTER_ED25519_KEY?: string;
  MASTER_ML_DSA_KEY?: string;
  ADMIN_AUTH_TOKEN?: string;
}

export type SigningVariables = {
  serverKeys: SovereignSigningKeys;
};

function constantTimeEqual(actual: string, expected: string): boolean {
  const encoder = new TextEncoder();
  const actualBytes = encoder.encode(actual);
  const expectedBytes = encoder.encode(expected);
  let mismatch = actualBytes.length ^ expectedBytes.length;
  const length = Math.max(actualBytes.length, expectedBytes.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (actualBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }
  return mismatch === 0;
}

function isHexKey(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && value.length % 2 === 0 && /^[\da-f]+$/i.test(value);
}

/**
 * Protects privileged mint handlers and exposes Worker-secret key material only
 * through server-side Hono context. Never copy these values into a response,
 * log, or client request. This middleware does not implement ML-DSA signing.
 */
export const requireSovereignSigningAuth = createMiddleware<{
  Bindings: SigningBindings;
  Variables: SigningVariables;
}>(async (c, next) => {
  const expectedToken = c.env.ADMIN_AUTH_TOKEN;
  if (!expectedToken) {
    return c.json({ success: false, error: 'Sovereign signing authorization is not configured' }, 503);
  }

  const authorization = c.req.header('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token || !constantTimeEqual(token, expectedToken)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const ed25519Hex = c.env.MASTER_ED25519_KEY;
  const mlDsa65Hex = c.env.MASTER_ML_DSA_KEY;
  if (!isHexKey(ed25519Hex) || !isHexKey(mlDsa65Hex)) {
    return c.json({ success: false, error: 'Sovereign signing keys are not configured correctly' }, 503);
  }

  c.set('serverKeys', { ed25519Hex, mlDsa65Hex });
  await next();
});
