import React, { useCallback, useEffect, useState } from 'react';
import { ArtworkUploadForm } from '../components/ArtworkUploadForm';

interface ArtAsset {
  id: string;
  title: string;
  artist_name: string;
  medium: string;
  dimensions: string | null;
  price_cents: number;
  image_url: string;
  status: 'available' | 'reserved' | 'sold';
}

export default function GalleryPage() {
  const [artworks, setArtworks] = useState<ArtAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArtworks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/artworks');
      const data = await response.json() as { artworks?: ArtAsset[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Unable to load the gallery.');
      setArtworks(Array.isArray(data.artworks) ? data.artworks : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the gallery.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadArtworks(); }, [loadArtworks]);

  return (
    <div style={{ padding: '2rem', background: '#0a0a0c', color: '#f0f0f5', minHeight: '100%', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #222', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 300, letterSpacing: '2px' }}>MAX ART GALLERY</h1>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>JURREAUISM Digital &amp; Physical Curation Space</p>
      </header>
      <ArtworkUploadForm onSuccess={() => { void loadArtworks(); }} />
      {loading ? <p role="status">Loading artworks…</p> : error ? <p role="alert">{error}</p> : artworks.length === 0 ? (
        <p style={{ color: '#aaa' }}>No artworks are listed yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {artworks.map((art) => (
            <article key={art.id} style={{ overflow: 'hidden', background: '#121216', border: '1px solid #222', borderRadius: '8px' }}>
              {art.image_url && <img src={art.image_url} alt={art.title} loading="lazy" style={{ display: 'block', width: '100%', height: '220px', objectFit: 'cover' }} />}
              <div style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#60a5fa', textTransform: 'uppercase' }}>{art.medium}</span>
                <h2 style={{ margin: '0.5rem 0', fontSize: '1.2rem' }}>{art.title}</h2>
                <p style={{ color: '#aaa' }}>By {art.artist_name}{art.dimensions ? ` · ${art.dimensions}` : ''}</p>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(art.price_cents / 100)} · {art.status}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
