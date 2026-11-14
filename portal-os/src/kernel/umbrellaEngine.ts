import type { DomainName } from './moduleEngine';

const ALLOWED_DOMAINS = new Set<DomainName>(['MAX_ART', 'MAX_CHESS', 'MAX_SPORT']);
export function routeSovereignDomain(value: string): DomainName {
  if (!ALLOWED_DOMAINS.has(value as DomainName)) throw new Error('Unsupported sovereign domain');
  return value as DomainName;
}
