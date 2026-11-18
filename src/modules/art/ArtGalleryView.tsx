import React, { useMemo, useState } from 'react';
import { useArtworks, type Artwork } from '../../hooks/useArtworks';
import ImmersiveGallery from './ImmersiveGallery';
import CollectorCheckout from './CollectorCheckout';
import WindowFrame from '../../core/WindowFrame';

export default function ArtGalleryView() {
  const { artworks, loading, error, reload } = useArtworks();
  const [query, setQuery] = useState('');
  const [medium, setMedium] = useState('All works');
  const [immersive, setImmersive] = useState(false);
  const [selected, setSelected] = useState<Artwork | null>(null);
  const filtered = useMemo(() => artworks.filter(a => (medium === 'All works' || a.medium === medium) && `${a.title} ${a.artist_name}`.toLowerCase().includes(query.toLowerCase())), [artworks, medium, query]);
  return <div className="module-view">
    <div className="module-heading"><div><span className="eyebrow">01 / MAX-ART · CREATIVE DOMAIN</span><h1>Art without <em>edges.</em></h1><p>Discover original work and the artists behind it.</p></div><button className="neon-button" aria-pressed={immersive} onClick={() => setImmersive(!immersive)}>{immersive ? 'Collection view' : 'Enter immersive gallery'} ↗</button></div>
    <div className="filter-row"><h2>The collection <sup>{filtered.length}</sup></h2><div className="collection-tools"><input aria-label="Search collection" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search works or artists"/><select aria-label="Filter medium" value={medium} onChange={e => setMedium(e.target.value)}>{['All works', ...new Set(artworks.map(a => a.medium))].map(m => <option key={m}>{m}</option>)}</select><button onClick={reload} disabled={loading}>Refresh</button></div></div>
    {loading ? <p role="status">Loading collection…</p> : error ? <div role="alert" className="data-state">{error}<button onClick={reload}>Try again</button></div> : !filtered.length ? <p className="data-state">{artworks.length ? 'No works match your search.' : 'No works have been published yet.'}</p> : immersive ? <ImmersiveGallery artworks={filtered} onSelect={setSelected}/> : <div className="art-grid">{filtered.map(a => <article className="art-card" key={a.id}><button className="art-card-image" onClick={() => setSelected(a)} aria-label={`Inspect ${a.title}`}><img src={a.image_url} alt={a.title} loading="lazy"/><span className="art-inspect">INSPECT ↗</span></button><div className="art-card-caption"><div><span className="micro-label">{a.medium} · {a.status}</span><h3>{a.title}</h3><p>{a.artist_name}</p></div><strong>{price(a.price_cents)}</strong></div></article>)}</div>}
    {selected && <WindowFrame title={selected.title} onClose={() => setSelected(null)}><div className="artwork-detail"><img src={selected.image_url} alt={selected.title}/><div><span className="eyebrow">{selected.status}</span><h2>{selected.title}</h2><p>By {selected.artist_name}</p><p>{selected.medium} · {selected.dimensions || 'Dimensions not specified'}</p><h3>{price(selected.price_cents)}</h3>{selected.bio && <p>{selected.bio}</p>}{selected.status==='available' && <CollectorCheckout artworkId={selected.id}/>}
{selected.provenance_hash && <p className="proof-hash">Asset SHA-256: {selected.provenance_hash}</p>}</div></div></WindowFrame>}
  </div>;
}
function price(cents: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100); }
