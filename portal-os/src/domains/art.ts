export interface ArtMetadata { title: string; medium: string; editionNumber: number; editionTotal: number }
export function validateArtMetadata(value: unknown): value is ArtMetadata {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return typeof data.title === 'string' && data.title.length > 0 && data.title.length <= 256 &&
    typeof data.medium === 'string' && data.medium.length > 0 && data.medium.length <= 128 &&
    Number.isInteger(data.editionNumber) && Number.isInteger(data.editionTotal) &&
    (data.editionNumber as number) > 0 && (data.editionTotal as number) >= (data.editionNumber as number);
}
