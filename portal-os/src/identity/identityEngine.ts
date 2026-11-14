export interface IdentityRecord { identity_id: string; handle: string; identity_type: string; pqc_public_key: string }

export async function resolveIdentity(db: D1Database, identityId: string): Promise<IdentityRecord | null> {
  if (!/^[\w:.-]{1,128}$/.test(identityId)) return null;
  return db.prepare(
    'SELECT identity_id, handle, identity_type, pqc_public_key FROM sovereign_identities WHERE identity_id = ?'
  ).bind(identityId).first<IdentityRecord>();
}
