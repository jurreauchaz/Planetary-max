import React, { Suspense, useEffect, useState } from 'react';
import PortalOS1Layout from './core/PortalOS1Layout';
const LegacySpaces = React.lazy(() => import('./ui/App'));
const AdminConsole = React.lazy(() => import('./modules/admin/PortalOS1Console'));
export default function App() {
  const [hash,setHash]=useState(window.location.hash);
  useEffect(()=>{const update=()=>setHash(window.location.hash); window.addEventListener('hashchange',update); return ()=>window.removeEventListener('hashchange',update);},[]);
  if (hash === '#/spaces') return <Suspense fallback={<div className="loading-screen">LOADING SPACES...</div>}><LegacySpaces /></Suspense>;
  return hash === '#/admin' || window.location.pathname.replace(/\/$/,'') === '/admin' ? <Suspense fallback={<div className="loading-screen">INITIALIZING PORTAL...</div>}><AdminConsole /></Suspense> : <PortalOS1Layout />;
}
