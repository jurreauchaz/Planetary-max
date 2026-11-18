export interface DigitalProduct {
  id: string; kind: 'game' | 'app' | 'media'; title: string; creator: string;
  description: string; image_url: string; destination_url: string;
  price_cents: number; currency: 'DAT' | 'USD' | 'USDC'; platform: string;
  version: string; status: 'draft' | 'published' | 'archived';
}
export function digitalPrice(p: Pick<DigitalProduct, 'price_cents' | 'currency'>) {
  return p.price_cents === 0 ? 'Free' : `${(p.price_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${p.currency}`;
}
