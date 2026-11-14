const LEAGUES = new Set(['NFL', 'NBA', 'WNBA', 'MLB', 'SOCCER', 'MMA', 'COLLEGIATE', 'ESPORTS']);
export function validateSportsMetadata(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return typeof data.league === 'string' && LEAGUES.has(data.league) &&
    typeof data.matchExternalId === 'string' && data.matchExternalId.length > 0 && data.matchExternalId.length <= 128 &&
    Number.isInteger(data.seasonYear) && (data.seasonYear as number) >= 1900 && (data.seasonYear as number) <= 2200;
}
