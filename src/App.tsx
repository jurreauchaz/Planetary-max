import React, { Suspense, useEffect, useState } from 'react';
import { CollectorVault } from './modules/art/CollectorCheckout';
import PortalOS1Layout from './core/PortalOS1Layout';
import BeemaxPortalCommandHud from './components/BeemaxPortalCommandHud';
import BeemaxHubIteration from './components/BeemaxHubIteration';
import MaxSportsUserHud from './modules/sports/MaxSportsUserHud';
const AdminConsole = React.lazy(() => import('./modules/admin/PortalOS1Console'));

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  if (window.location.pathname.startsWith('/vault/')) return <CollectorVault />;
  if (hash === '#/sports-outputs') return <MaxSportsUserHud />;
  if (hash === '#/hud' || hash === '#/portal-os1') return <BeemaxPortalCommandHud />;
  if (hash === '#/admin' || window.location.pathname.replace(/\/$/, '') === '/admin') {
    return <Suspense fallback={<div className="loading-screen">INITIALIZING PORTAL...</div>}><AdminConsole /></Suspense>;
  }
  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: 16 }}>
      <BeemaxHubIteration />
      <PortalOS1Layout />
    </main>
  );
}
