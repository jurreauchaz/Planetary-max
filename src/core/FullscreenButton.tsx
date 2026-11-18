import React, { useEffect, useState } from 'react';
export default function FullscreenButton() {
  const [active, setActive] = useState(Boolean(document.fullscreenElement));
  const [error, setError] = useState('');
  useEffect(() => { const update = () => setActive(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', update); return () => document.removeEventListener('fullscreenchange', update); }, []);
  if (!document.fullscreenEnabled) return null;
  return <span className="fullscreen-control"><button type="button" aria-label={active ? 'Exit fullscreen' : 'Enter fullscreen'} title={active ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={async () => { try { setError(''); if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setError('Fullscreen is unavailable in this view. Open the preview in a new tab.'); } }}>⛶</button>{error && <small role="status">{error}</small>}</span>;
}
