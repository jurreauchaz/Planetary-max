import React, { useState } from 'react';
import { PortalThreeCanvas } from './PortalThreeCanvas';

type Space = 'all' | 'art' | 'chess' | 'sports';

const styles = `
.portal-master{width:min(100% - 2rem,80rem);margin:2rem auto;background:#020617;border:1px solid rgba(168,85,247,.4);border-radius:1rem;overflow:hidden;color:#e2e8f0;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 25px 60px #0008}
.portal-master *{box-sizing:border-box}.portal-master button{font:inherit;cursor:pointer}.portal-master-nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1.5rem;background:#0f172a;border-bottom:1px solid rgba(168,85,247,.3)}
.portal-master-brand{color:#c084fc;font-weight:700;letter-spacing:.12em;font-size:11px}.portal-master-tabs{display:flex;flex-wrap:wrap;gap:.5rem}.portal-master-tabs button{border:0;border-radius:.35rem;padding:.45rem .7rem;background:#1e293b;color:#cbd5e1}.portal-master-tabs button[aria-pressed=true]{background:#7c3aed;color:white}
.portal-master-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(250px,1fr);height:680px;gap:4px;padding:4px}.portal-master-grid.single{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(560px,1fr)}
.portal-space{display:flex;min-width:0;flex-direction:column;justify-content:space-between;overflow:auto;padding:1rem;border:1px solid #334155;border-radius:.6rem;background:rgba(15,23,42,.8)}.portal-space h2{margin:0;color:#67e8f9;font-size:12px}.portal-space.chess h2{color:#fbbf24}.portal-space.sports h2{color:#6ee7b7}.portal-space.core h2{color:#c084fc}.portal-space-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.portal-badge{padding:.25rem .45rem;border-radius:.3rem;background:#052e2b;color:#6ee7b7;font-size:10px;white-space:nowrap}.portal-space p{margin:.65rem 0 1rem;color:#94a3b8;font-size:11px;line-height:1.55}.portal-card{padding:.75rem;border:1px solid #1e293b;border-radius:.5rem;background:#020617;color:#cbd5e1}.portal-art-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}.portal-art-card{min-width:0;padding:.5rem;border:1px solid #1e293b;border-radius:.5rem;background:#020617}.portal-art-card img{display:block;width:100%;height:100px;object-fit:cover;border-radius:.3rem}.portal-art-card strong{display:block;margin-top:.5rem;font-size:10px}.portal-space-action{width:100%;margin-top:1rem;padding:.6rem;border:0;border-radius:.4rem;background:#0891b2;color:white;font-weight:700}.portal-space.chess .portal-space-action{background:#d97706}.portal-space.sports .portal-space-action{background:#059669}.portal-space.core .portal-space-action{background:#7c3aed}.portal-code{margin-top:.7rem;padding:.65rem;border-radius:.4rem;background:#0f172a;color:#a5b4fc;font-size:10px;line-height:1.6}.portal-canvas{height:150px;min-height:150px;margin-top:.75rem}
@media(max-width:700px){.portal-master{width:calc(100% - 1rem);margin:.5rem auto}.portal-master-nav{align-items:flex-start;flex-direction:column;padding:1rem}.portal-master-tabs button{padding:.4rem .55rem;font-size:10px}.portal-master-grid{grid-auto-rows:minmax(260px,auto);height:auto;min-height:680px}.portal-master-grid.single{min-height:560px}.portal-space{min-height:260px}}
@media(max-width:480px){.portal-master-grid{grid-template-columns:minmax(0,1fr)}.portal-master-grid.single{grid-template-rows:minmax(560px,1fr)}}
`;

export const PortalMasterSpaces: React.FC = () => {
  const [activeSpace, setActiveSpace] = useState<Space>('all');
  const tabs: { id: Space; label: string }[] = [
    { id: 'all', label: 'Quad View' },
    { id: 'art', label: 'MAX-Art Gallery' },
    { id: 'chess', label: 'MAX Chess 3D' },
    { id: 'sports', label: 'Sports Wagering' },
  ];

  return (
    <section className="portal-master" aria-label="MAX Spaces viewport">
      <style>{styles}</style>
      <header className="portal-master-nav">
        <span className="portal-master-brand">MAX-INTERNET // SPATIAL DECK</span>
        <nav className="portal-master-tabs" aria-label="Choose a space">
          {tabs.map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={activeSpace === id} onClick={() => setActiveSpace(id)}>{label}</button>
          ))}
        </nav>
      </header>

      <div className={`portal-master-grid${activeSpace === 'all' ? '' : ' single'}`}>
        {(activeSpace === 'all' || activeSpace === 'art') && (
          <article className="portal-space art">
            <div>
              <div className="portal-space-header"><h2>max://art.space // Immersive Gallery</h2><span className="portal-badge">Storefront Active</span></div>
              <p>Original canvases, charcoal figure studies, and poetic provenance minting.</p>
              <div className="portal-art-grid">
                <div className="portal-art-card"><img src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80" alt="Colorful framed artwork" loading="lazy" /><strong>The Event · 0.5 ETH</strong></div>
                <div className="portal-art-card"><img src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&auto=format&fit=crop&q=80" alt="Abstract colorful artwork" loading="lazy" /><strong>Sideros-Friction · 0.35 ETH</strong></div>
              </div>
              {activeSpace === 'art' && <div className="portal-canvas"><PortalThreeCanvas moduleType="art" /></div>}
            </div>
            <button type="button" className="portal-space-action">Mint New Canvas / Artwork</button>
          </article>
        )}

        {(activeSpace === 'all' || activeSpace === 'chess') && (
          <article className="portal-space chess">
            <div>
              <div className="portal-space-header"><h2>max://chess.node // 3D Spatial Arena</h2><span className="portal-badge" style={{ background: '#451a03', color: '#fbbf24' }}>PGN Verified</span></div>
              <p>Ruy Lopez Closed &amp; Sicilian Alapin tournament engine.</p>
              <div className="portal-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}><span>Active Match: MaxJ vs Grandmaster Bot</span><span style={{ color: '#fbbf24' }}>Turn: White (Move 14)</span></div>
                <div className="portal-code">1. e4 c5 2. c3 d5 3. exd5 Qxd5 4. d4 Nf6 5. Nf3 e6</div>
              </div>
              {activeSpace === 'chess' && <div className="portal-canvas"><PortalThreeCanvas moduleType="chess" /></div>}
            </div>
            <button type="button" className="portal-space-action">Enter 3D Chess Board View</button>
          </article>
        )}

        {(activeSpace === 'all' || activeSpace === 'sports') && (
          <article className="portal-space sports">
            <div>
              <div className="portal-space-header"><h2>max://sports.telemetry // Oracle Hub</h2><span className="portal-badge">Consensus Live</span></div>
              <p>Predictive telemetry and peer wagering ledger across NFL, NBA, and Soccer.</p>
              <div className="portal-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem' }}>
                <div><strong>Knicks vs. Celtics</strong><div style={{ marginTop: '.35rem', color: '#6ee7b7', fontSize: '10px' }}>Odds: BOS -3.5 (Over 214.5)</div></div>
                <button type="button" style={{ border: 0, borderRadius: '.35rem', padding: '.45rem .65rem', background: '#059669', color: 'white' }}>Place Stake</button>
              </div>
              {activeSpace === 'sports' && <div className="portal-canvas"><PortalThreeCanvas moduleType="sports" /></div>}
            </div>
            <button type="button" className="portal-space-action">View Global Oracle Ledger</button>
          </article>
        )}

        {activeSpace === 'all' && (
          <article className="portal-space core">
            <div>
              <div className="portal-space-header"><h2>max://beemax.core // Spatial Mirror</h2><span className="portal-badge" style={{ background: '#3b0764', color: '#d8b4fe' }}>Neural Link Active</span></div>
              <p>Synchronizing audio streams and spatial window states across the D1 grid.</p>
              <div className="portal-code">All domains bound to D1 instance:<br />27f854d1-6c29-4a30-aaa5-345da09b02ff</div>
              <div className="portal-canvas"><PortalThreeCanvas moduleType="core" /></div>
            </div>
            <button type="button" className="portal-space-action" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.querySelector('.portal-master')?.requestFullscreen()}>Toggle Fullscreen Spatial Link</button>
          </article>
        )}
      </div>
    </section>
  );
};

export default PortalMasterSpaces;
