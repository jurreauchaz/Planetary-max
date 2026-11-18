import React, { useEffect, useState } from 'react';
import WindowFrame from '../../core/WindowFrame';
import { digitalPrice, type DigitalProduct } from './types';
export default function DigitalStorefront({ media = false }: { media?: boolean }) {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<DigitalProduct | null>(null);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [revision, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setSelected(null);
    fetch('/api/catalog', { signal: controller.signal }).then(async r => {
      const data = await r.json() as { products?: DigitalProduct[]; error?: string };
      if (!r.ok || !Array.isArray(data.products)) throw new Error(data.error || 'Catalog unavailable.');
      setProducts(data.products);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Catalog unavailable.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [media, revision]);
  const items = products.filter(p => (media ? p.kind === 'media' : p.kind !== 'media') && (filter === 'all' || p.kind === filter) && `${p.title} ${p.creator} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="module-view"><div className="module-heading"><div><span className="eyebrow">{media ? '05 / MAX MEDIA · PUBLISHING & DISTRIBUTION' : '04 / MAX GAMES & APPS · DIGITAL STOREFRONT'}</span><h1>{media ? <>Stories with <em>reach.</em></> : <>Built to <em>play.</em></>}</h1><p>{media ? 'Independent releases, films, audio, and publications. Discover the people behind the work.' : 'Explore games and tools from the MAX ecosystem. Launch a free release or visit its official store.'}</p></div>{!media && <a className="neon-button" href="#/chess">Play MAX Chess ↗</a>}</div>
    <div className="filter-row"><h2>{media ? 'Published releases' : 'Games & applications'} <sup>{items.length}</sup></h2><div className="collection-tools"><input aria-label="Search digital catalog" placeholder="Search releases or creators" value={query} onChange={e => setQuery(e.target.value)}/>{!media && <select aria-label="Catalog category" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All releases</option><option value="game">Games</option><option value="app">Apps</option></select>}<button onClick={() => refresh(n => n + 1)} disabled={loading}>Refresh</button></div></div>
    {loading ? <p role="status">Loading releases…</p> : error ? <p role="alert" className="data-state">{error}</p> : !items.length ? <div className="data-state"><p>{query || filter !== 'all' ? 'No releases match your search.' : 'No releases have been published yet.'}</p><a href="#/admin">Open the publishing desk ↗</a></div> : <div className="art-grid digital-grid">{items.map(p => <article className="art-card" key={p.id}><button className="art-card-image" onClick={() => setSelected(p)} aria-label={`Explore ${p.title}`}><img src={p.image_url} alt={p.title} loading="lazy"/><span className="art-inspect">EXPLORE ↗</span></button><div className="digital-caption"><span className="micro-label">{p.kind} / {p.platform}</span><h3>{p.title}</h3><p>{p.creator}</p><strong>{digitalPrice(p)}</strong><button onClick={() => setSelected(p)}>View release ↗</button></div></article>)}</div>}
    {selected && <WindowFrame title={selected.title} onClose={() => setSelected(null)}><div className="artwork-detail"><img src={selected.image_url} alt={selected.title}/><div><span className="eyebrow">{selected.kind} / {selected.platform}</span><h2>{selected.title}</h2><p>By {selected.creator} · Version {selected.version}</p><p className="release-description">{selected.description}</p><h3>{digitalPrice(selected)}</h3><a className="neon-button" href={selected.destination_url} target="_blank" rel="noopener noreferrer">{selected.price_cents ? 'Visit purchase page' : media ? 'Open release' : 'Launch release'} ↗</a><p className="quiet">Opens {new URL(selected.destination_url).hostname}. {selected.price_cents > 0 && 'Payment, access, and delivery are handled by the linked store.'}</p></div></div></WindowFrame>}
  </div>;
}
