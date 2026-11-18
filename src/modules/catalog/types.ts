export interface DigitalProduct {
  id: string; kind: 'game' | 'app' | 'media'; title: string; creator: string;
  description: string; image_url: string; destination_url: string | null;
  price_cents: number; currency: 'DAT' | 'USD' | 'USDC'; platform: string;
  preview_video_url?: string | null; gallery_images_json?: string; fulfillment_uri?: string | null; delivery_protection?: 'encrypted' | 'access_controlled'; metadata_hash?: string | null; total_editions?: number; sold_count?: number; direct_acquisition?: number;
  version: string; status: 'draft' | 'published' | 'archived';
}
export function digitalPrice(p: Pick<DigitalProduct, 'price_cents' | 'currency'>) {
  return p.price_cents === 0 ? 'Free' : `${(p.price_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${p.currency}`;
}
