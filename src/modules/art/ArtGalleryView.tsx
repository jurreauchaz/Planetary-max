import React, { useState } from 'react';
import { useArtworks } from '../../hooks/useArtworks';

export default function ArtGalleryView() {
  const { artworks, loading, error } = useArtworks();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  async function checkout(itemId: string) {
    setPending(itemId); setMessage('');
    try {
      const response = await fetch('/api/sovereign/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, buyer_email: email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout failed');
      setMessage(`${data.message} Reference: ${data.transaction.reference}`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Checkout failed'); }
    finally { setPending(null); }
  }
  return <section className="module-view">
    <div className="module-heading"><div><span className="eyebrow">01 / MAX-ART</span><h1>Sovereign <em>collection.</em></h1><p>Artwork inventory from the sovereign catalog.</p></div></div>
    <label>Collector email <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
    {message && <p role="status">{message}</p>}
    {loading ? <p role="status">Loading collection…</p> : error ? <p role="alert">{error}</p> : !artworks.length ? <p>No artworks available.</p> :
      <div className="art-grid">{artworks.map(art => <article className="art-card" key={art.id}>
        <img src={art.image_url} alt={art.title} loading="lazy" style={{ width: '100%', height: 260, objectFit: 'cover' }} />
        <div className="art-card-caption"><div><h2>{art.title}</h2><p>{art.artist_name} · {art.medium}</p><p>{(art.price_cents / 100).toFixed(2)} {art.currency} · {art.status}</p>
          <button disabled={pending !== null || art.status !== 'available' || !email} onClick={() => void checkout(art.id)}>{pending === art.id ? 'Recording…' : 'Request checkout'}</button>
        </div></div>
      </article>)}</div>}
  </section>;
}
