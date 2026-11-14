/**
 * Browser-side API transport for Portal-OS.
 * Private signing keys are deliberately not part of these request types. Signing
 * must happen in a trusted server-side signer, never in the browser.
 */
const API_BASE = '/v1';

type MintArtPayload = {
  title: string;
  medium: 'CHARCOAL_ON_CANVAS' | 'MIXED_MEDIA_COLLAGE' | 'DIGITAL_CANVAS' | 'MANUSCRIPT';
  dimensions?: string;
  editionNumber?: number;
  editionTotal?: number;
  doctrineTag?: string;
  originatorId: string;
  artifactUri: string;
  rawPayloadString: string;
  royaltyBps?: number;
};

type MintChessPayload = {
  title: string;
  whitePlayerId: string;
  blackPlayerId: string;
  ecoCode?: string;
  openingName?: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  pgnContent: string;
  originatorId: string;
  artifactUri: string;
  royaltyBps?: number;
};

type MintSportsPayload = {
  title: string;
  league: 'NFL' | 'NBA' | 'WNBA' | 'MLB' | 'SOCCER' | 'MMA' | 'COLLEGIATE' | 'ESPORTS';
  matchExternalId: string;
  artifactCategory: 'PREDICTION_MODEL' | 'TELEMETRY_FEED' | 'NIL_CONTRACT' | 'PERFORMANCE_PROOF';
  oracleConsensusJson: string;
  seasonYear: number;
  rawPayloadString: string;
  originatorId: string;
  artifactUri: string;
  royaltyBps?: number;
};

const forbiddenKeyNames = new Set(['secretkey', 'privatekey', 'ed25519hex', 'mldsa65hex', 'signingkey', 'signingsecret']);

function rejectClientSecrets(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) throw new Error('Mint payload must not contain cyclic references.');
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (forbiddenKeyNames.has(normalizedKey)) {
      throw new Error('Signing key material must never be sent from the browser.');
    }
    rejectClientSecrets(nested, seen);
  }
  seen.delete(value);
}

async function postMint<T>(path: string, payload: T, errorMessage: string) {
  rejectClientSecrets(payload);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null) as { error?: unknown } | null;
    throw new Error(typeof detail?.error === 'string' ? detail.error : errorMessage);
  }
  return res.json() as Promise<{ success?: boolean; data?: unknown }>;
}

export function mintArtAsset(payload: MintArtPayload) {
  return postMint('/dat/art', payload, 'Failed to mint art asset');
}

export function mintChessGame(payload: MintChessPayload) {
  return postMint('/dat/chess', payload, 'Failed to mint chess game record');
}

export function mintSportsArtifact(payload: MintSportsPayload) {
  return postMint('/dat/sports', payload, 'Failed to mint sports artifact');
}
