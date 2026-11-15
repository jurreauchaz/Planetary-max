import React, { useState } from 'react';

const nodes = [
  { name: 'MAX-MIND Core', id: 'CORE-01', type: 'Intelligence', color: 'purple' },
  { name: 'BEE-MAX Gateway', id: 'BEE-05', type: 'Registry', color: 'gold' },
  { name: 'D1 Ledger', id: 'D1-06', type: 'Storage', color: 'blue' },
];
export default function BeeMaxControlDeck() {
  const [filter, setFilter] = useState<'all' | 'core'>('all');
  return <div className="deck-body">
    <div className="deck-intro"><div className="deck-icon">⬡</div><div><strong>Secure registry</strong><p>Node identity &amp; connection overview</p></div><span className="demo-tag">SAMPLE</span></div>
    <div className="deck-stats"><div><span>REGISTERED NODES</span><strong>06 <small>nodes</small></strong></div><div><span>CONNECTIONS</span><strong>09 <small>links</small></strong></div></div>
    <div className="deck-list-heading"><span>NODE REGISTRY <small> / SAMPLE</small></span><div className="filter-buttons"><button className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>All</button><button className={filter==='core'?'selected':''} onClick={()=>setFilter('core')}>Core</button></div></div>
    <div className="registry-list">{nodes.filter(node=>filter==='all'||node.id==='CORE-01').map(node=><div className="registry-row" key={node.id}><span className={`registry-icon ${node.color}`}>✦</span><div><strong>{node.name}</strong><small>{node.id} · {node.type}</small></div><span className="sample-state">Sample</span></div>)}</div>
    <div className="deck-note"><span>◈</span><p>Registry access is protected.<br/><strong>Live telemetry is not connected.</strong></p></div>
  </div>;
}
