import React, { useEffect, useState } from 'react';
export default function SystemTelemetryBar() {
 const [now,setNow]=useState(new Date()); const [online,setOnline]=useState(navigator.onLine);
 useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),1000);const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{clearInterval(id);window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 return <div className="telemetry-bar"><span><i className={online?'live-dot':'offline-dot'}/>{online?'BROWSER ONLINE':'BROWSER OFFLINE'}</span><span className="telemetry-protocol">DAT-JURREAUISM-v1</span><span>◷ {now.toLocaleTimeString('en-GB',{timeZone:'UTC'})} UTC</span></div>;
}
