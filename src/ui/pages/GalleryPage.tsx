import React, { useEffect, useState } from 'react';

type ArtAsset = {
  id: string;
  title: string;
  medium: string;
  doctrine?: string | null;
};

const fallbackArt: ArtAsset[] = [
  { id: 'DAT-ART-01', title: 'Sideros-Friction Study I', medium: 'CHARCOAL_ON_CANVAS', doctrine: 'JURREAUISM' },
  { id: 'DAT-ART-02', title: 'The Crown of Return', medium: 'DIGITAL_CANVAS', doctrine: 'JURREAUISM' },
];

export default function GalleryPage() {
  const [artAssets, setArtAssets] = useState<ArtAsset[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/v1/dat/art/list')
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load the MAX Art collection.');
        return res.json() as Promise<{ items?: ArtAsset[] }>;
      })
      .then((data) => { if (active) setArtAssets(data.items ?? []); })
      .catch(() => { if (active) setArtAssets(fallbackArt); });
    return () => { active = false; };
  }, []);

  return (
    <main style={{ padding: '2rem', background: '#0a0a0c', color: '#f0f0f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #222', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 300, letterSpacing: '2px' }}>MAX ART GALLERY</h1>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>JURREAUISM Digital &amp; Physical Curation Space</p>
      </header>
      {artAssets.length === 0 ? <p role="status" style={{ color: '#aaa' }}>No artworks are currently listed.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {artAssets.map((art) => (
            <article key={art.id} style={{ background: '#121216', border: '1px solid #222', padding: '1.5rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px' }}>{art.medium}</span>
              <h2 style={{ margin: '0.5rem 0', fontSize: '1.2rem' }}>{art.title}</h2>
              <p style={{ fontSize: '0.85rem', color: '#aaa' }}>Doctrine: {art.doctrine || 'JURREAUISM'}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
