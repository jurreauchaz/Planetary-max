export interface LegalAuditEntry { eventId: string; classification: string; recordedAt: number }

export function createLegalAuditEntry(classification: string): LegalAuditEntry {
  if (!/^[A-Z0-9_]{1,64}$/.test(classification)) throw new Error('Invalid legal classification');
  return { eventId: crypto.randomUUID(), classification, recordedAt: Date.now() };
}
