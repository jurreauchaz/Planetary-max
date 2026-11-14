import { computeSovereignHash, signHybridMessage } from '../quantum/pqc';

export interface ArtMetadata { title: string; medium: string; editionNumber: number; editionTotal: number }
export function validateArtMetadata(value: unknown): value is ArtMetadata {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return typeof data.title === 'string' && data.title.length > 0 && data.title.length <= 256 &&
    typeof data.medium === 'string' && data.medium.length > 0 && data.medium.length <= 128 &&
    Number.isInteger(data.editionNumber) && Number.isInteger(data.editionTotal) &&
    (data.editionNumber as number) > 0 && (data.editionTotal as number) >= (data.editionNumber as number);
}

export interface MintArtInput {
  title: string;
  medium: 'CHARCOAL_ON_CANVAS' | 'MIXED_MEDIA_COLLAGE' | 'DIGITAL_CANVAS' | 'MANUSCRIPT';
  dimensions?: string;
  editionNumber?: number;
  editionTotal?: number;
  doctrineTag?: string;
  physicalLocation?: string;
  originatorId: string;
  artifactUri: string;
  rawPayloadString: string;
  royaltyBps?: number;
  secretKey: { ed25519Hex: string; mlDsa65Hex: string };
}

export async function mintArtAsset(db: D1Database, input: MintArtInput) {
  const datId = `DAT-ART-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const contentHash = computeSovereignHash(input.rawPayloadString);
  const now = Date.now();
  const mintManifest = JSON.stringify({ datId, domain: 'MAX_ART', contentHash, originatorId: input.originatorId, createdAt: now });
  const pqcSignature = signHybridMessage(mintManifest, input.secretKey);

  const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const genesisEventPayload = JSON.stringify({
    eventId, datId, eventType: 'MINTED', toIdentityId: input.originatorId, prevEventHash: 'GENESIS', timestamp: now,
  });
  const eventHash = computeSovereignHash(genesisEventPayload);
  const actorSignature = signHybridMessage(eventHash, input.secretKey);

  await db.batch([
    db.prepare(
      `INSERT INTO dat_assets (dat_id, domain, asset_type, title, originator_id, current_owner_id, content_hash, artifact_uri, pqc_signature, royalty_bps, status, created_at)
       VALUES (?, 'MAX_ART', 'CANVAS_WORK', ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`
    ).bind(datId, input.title, input.originatorId, input.originatorId, contentHash, input.artifactUri, pqcSignature, input.royaltyBps ?? 1000, now),
    db.prepare(
      `INSERT INTO dat_ext_art (dat_id, medium, dimensions, edition_number, edition_total, doctrine_tag)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(datId, input.medium, input.dimensions ?? null, input.editionNumber ?? 1, input.editionTotal ?? 1, input.doctrineTag ?? 'JURREAUISM'),
    db.prepare(
      `INSERT INTO dat_provenance_events (event_id, dat_id, event_type, from_identity_id, to_identity_id, prev_event_hash, event_hash, actor_signature, occurred_at)
       VALUES (?, ?, 'MINTED', NULL, ?, 'GENESIS', ?, ?, ?)`
    ).bind(eventId, datId, input.originatorId, eventHash, actorSignature, now),
  ]);

  return { datId, domain: 'MAX_ART', contentHash, eventId, status: 'MINTED_AND_SEALED' };
}
