import React, { useEffect, useRef, useState } from 'react';
import './BeemaxPortalCommandHud.css';

type Scope = 'BEEMAX' | 'MAX-ECOSYSTEM' | 'MAX-INSTITUTE' | 'MAX-MEDIA' | 'MAX-SPORTS' | 'MAX-SPACES' | 'INSTANT-SPACE' | 'MAX-SOVEREIGN';
type Gateway = { id: string; label: string; role: string };
type Entry = { id: number; sender: 'OPERATOR' | 'COMMAND_HUD' | 'SYSTEM'; scope: Scope; heading: string; points: string[]; time: string };
const SCOPES: Scope[] = ['BEEMAX', 'MAX-ECOSYSTEM', 'MAX-INSTITUTE', 'MAX-MEDIA', 'MAX-SPORTS', 'MAX-SPACES', 'INSTANT-SPACE', 'MAX-SOVEREIGN'];
const GATEWAYS: Gateway[] = [
  { id: 'G1', label: 'Charter & Governance', role: 'Charter principles, sovereignty and public-access boundaries.' },
  { id: 'G2', label: 'ICV Architecture', role: 'Internal cognitive and value pathways across MAX modules.' },
  { id: 'G3', label: 'Organization & Entities', role: 'Organizational structure connecting modules and roles.' },
  { id: 'G4', label: 'Cognitive Synthesis', role: 'Structured reasoning and drafting layers.' },
  { id: 'G5', label: 'Media & Publishing', role: 'Public releases, cover art and SHA-256 metadata.' },
  { id: 'G6', label: 'Sports & Telemetry', role: 'HLS video screen and reported MAX-SPORTS telemetry.' },
  { id: 'G7', label: 'Edge & Continuity', role: 'Cloudflare Workers, D1, KV and Durable Objects.' },
];
const QUICK = ['/scope max-institute', '/gateway G1', '/space instant', '/media', '/state', '/help', '/clear'];
const RELEASE = 'The Crown of Return (3c8ee1c4-79b8-4bfd-be18-430679f452f2) — 30.00 USDC · 500 editions';
const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

type HlsPlayer = { loadSource: (url: string) => void; attachMedia: (media: HTMLMediaElement) => void; destroy: () => void; on: (event: string, callback: (_event: unknown, data: { fatal?: boolean; type?: string; details?: string }) => void) => void };
type HlsConstructor = { new(options?: Record<string, unknown>): HlsPlayer; isSupported: () => boolean; Events: { MANIFEST_PARSED: string; ERROR: string } };
declare global { interface Window { Hls?: HlsConstructor } }

export default function BeemaxPortalCommandHud() {
  const [scope, setScope] = useState<Scope>('BEEMAX');
  const [gateway, setGateway] = useState('G1');
  const [instituteView, setInstituteView] = useState<'gateways' | 'charter' | 'icvs' | 'org'>('gateways');
  const [spaceTitle, setSpaceTitle] = useState('Instant Digital Space #01');
  const [spaceNotes, setSpaceNotes] = useState('Ready for scoped notes and commands.');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamStatus, setStreamStatus] = useState('Idle — enter an .m3u8 HLS URL');
  const [showVideo, setShowVideo] = useState(true);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [entries, setEntries] = useState<Entry[]>([{ id: 1, sender: 'COMMAND_HUD', scope: 'BEEMAX', heading: 'BEEMAX-PORTAL-OS1 ready', points: ['Public MAX-INTERNET pages stay free to browse.', 'Routing and state changes are deterministic in this browser; this HUD does not execute payments or operator actions.', 'Use /help to see commands.'], time: clock() }]);
  const nextId = useRef(2);
  const video = useRef<HTMLVideoElement>(null);
  const player = useRef<HlsPlayer | null>(null);
  const addEntry = (sender: Entry['sender'], target: Scope, heading: string, points: string[] = []) => setEntries(items => [...items, { id: nextId.current++, sender, scope: target, heading, points, time: clock() }].slice(-100));

  function clearVideo() {
    player.current?.destroy(); player.current = null;
    if (video.current) { video.current.pause(); video.current.removeAttribute('src'); video.current.load(); }
  }
  function attachVideo(url = streamUrl) {
    const target = url.trim();
    clearVideo();
    if (!target) { setStreamStatus('Stream cleared'); return; }
    if (!/^https:\/\//i.test(target) || !/\.m3u8(?:$|[?#])/i.test(target)) { setStreamStatus('Enter a direct HTTPS .m3u8 URL'); return; }
    const el = video.current;
    if (!el) { setStreamStatus('Video element unavailable'); return; }
    if (window.Hls?.isSupported()) {
      const hls = new window.Hls({ enableWorker: true }); player.current = hls;
      hls.loadSource(target); hls.attachMedia(el);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => { setStreamStatus('HLS manifest loaded — press Play if playback does not start'); });
      hls.on(window.Hls.Events.ERROR, (_event, data) => { if (data.fatal) setStreamStatus(`HLS error: ${data.type || 'unknown'} (${data.details || 'stream unavailable'})`); });
      setStreamStatus('Loading HLS manifest…'); return;
    }
    if (el.canPlayType('application/vnd.apple.mpegurl')) { el.src = target; setStreamStatus('Native HLS stream attached — press Play'); return; }
    const script = document.querySelector<HTMLScriptElement>('script[data-beemax-hls]') ?? document.createElement('script');
    const attachWhenReady = () => {
      if (!window.Hls?.isSupported() || !video.current) { setStreamStatus('HLS.js could not be loaded in this browser'); return; }
      const hls = new window.Hls({ enableWorker: true }); player.current = hls; hls.loadSource(target); hls.attachMedia(video.current);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => setStreamStatus('HLS manifest loaded — press Play if needed'));
      hls.on(window.Hls.Events.ERROR, (_event, data) => { if (data.fatal) setStreamStatus(`HLS error: ${data.type || 'unknown'} (${data.details || 'stream unavailable'})`); });
      setStreamStatus('Loading HLS manifest…');
    };
    if (window.Hls) { attachWhenReady(); return; }
    if (!script.src) { script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js'; script.async = true; script.dataset.beemaxHls = 'true'; document.head.appendChild(script); }
    script.addEventListener('load', attachWhenReady, { once: true });
    script.addEventListener('error', () => setStreamStatus('Could not load HLS.js; check connection or use a native-HLS browser.'), { once: true });
    setStreamStatus('Loading HLS.js player…');
  }
  useEffect(() => () => { player.current?.destroy(); player.current = null; }, []);

  function execute(raw = input) {
    const line = raw.trim(); if (!line) return;
    setHistory(items => [line, ...items].slice(0, 50)); setCursor(-1); setInput('');
    addEntry('OPERATOR', scope, line);
    const normalized = line.toLowerCase();
    if (normalized === '/clear') { setEntries([]); return; }
    if (normalized === '/help') { addEntry('COMMAND_HUD', scope, 'Command reference', ['/scope <name> — switch to a listed scope', '/gateway <G1–G7> — focus an Institute gateway', '/space instant — open Instant Digital Space', '/media — toggle the HLS video screen', '/state — show current UI state and release anchor', '/help and /clear']); return; }
    if (normalized === '/space instant') { setScope('INSTANT-SPACE'); addEntry('COMMAND_HUD', 'INSTANT-SPACE', `${spaceTitle} active`, [spaceNotes, 'Scratchpad changes stay in this browser session.']); return; }
    if (normalized.startsWith('/scope ')) {
      const candidate = line.slice(7).trim().toUpperCase() as Scope;
      if (SCOPES.includes(candidate)) { setScope(candidate); addEntry('COMMAND_HUD', candidate, `Scope switched to ${candidate}`, candidate === 'MAX-INSTITUTE' ? [`Focused gateway: ${gateway}`] : []); }
      else addEntry('SYSTEM', scope, 'Unknown scope', [`Available: ${SCOPES.join(', ')}`]);
      return;
    }
    if (normalized.startsWith('/gateway ')) {
      const code = line.slice(9).trim().toUpperCase(); const found = GATEWAYS.find(item => item.id === code);
      if (found) { setScope('MAX-INSTITUTE'); setGateway(found.id); setInstituteView('gateways'); addEntry('COMMAND_HUD', 'MAX-INSTITUTE', `Focused ${found.id} — ${found.label}`, [found.role]); }
      else addEntry('SYSTEM', scope, 'Invalid gateway', ['Use G1 through G7.']);
      return;
    }
    if (normalized === '/media') { const next = !showVideo; setShowVideo(next); addEntry('COMMAND_HUD', scope, next ? 'HLS video screen shown' : 'HLS video screen hidden', [streamStatus]); return; }
    if (normalized === '/state') { addEntry('COMMAND_HUD', scope, 'HUD state snapshot', [`Scope: ${scope}`, `Gateway: ${gateway} · ${GATEWAYS.find(item => item.id === gateway)?.label}`, `Institute view: ${instituteView}`, `Video stage: ${showVideo ? 'visible' : 'hidden'} · ${streamStatus}`, `Release anchor: ${RELEASE}`, 'Public browsing: free · Operator sign-in: not required · wallet funding: not required']); return; }
    const lower = normalized;
    const route: Scope | undefined = /\b(institute|charter|icv|gateway|organization|org)\b/.test(lower) ? 'MAX-INSTITUTE' : /\b(media|film|video|release)\b/.test(lower) ? 'MAX-MEDIA' : /\b(sports|sport|match|telemetry|hls)\b/.test(lower) ? 'MAX-SPORTS' : /\b(instant digital space|instant space)\b/.test(lower) ? 'INSTANT-SPACE' : /\b(space|spaces|room)\b/.test(lower) ? 'MAX-SPACES' : /\b(sovereign|wallet|identity)\b/.test(lower) ? 'MAX-SOVEREIGN' : /\b(ecosystem|internet|public|browse)\b/.test(lower) ? 'MAX-ECOSYSTEM' : /\b(beemax|assistant|chat)\b/.test(lower) ? 'BEEMAX' : undefined;
    if (route) { setScope(route); addEntry('COMMAND_HUD', route, `Locally routed to ${route}`, ['This HUD does not send prompts to an AI model or execute backend actions. Open-ended drafting remains in BEEMAX.']); }
    else addEntry('COMMAND_HUD', scope, `${scope} — deterministic response`, [`Received: ${line}`, 'No matching route; try /help. For open-ended reasoning, use the existing BEEMAX assistant.']);
  }

  const activeGateway = GATEWAYS.find(item => item.id === gateway) ?? GATEWAYS[0];
  return <div className="beemax-hud">
    <header className="hud-top"><a href="/" className="hud-brand">✳ BEEMAX-PORTAL-OS1</a><span className="hud-free">● PUBLIC · FREE BROWSING</span><a className="hud-operator" href="/#/admin">Operator sign-in ↗</a><div className="hud-scopes">{SCOPES.map(item => <button key={item} className={scope === item ? 'active' : ''} onClick={() => setScope(item)}>{item}</button>)}</div></header>
    <div className="hud-grid">
      <aside className="hud-card institute-card"><h2>MAX-INSTITUTE</h2><div className="institute-tabs">{(['gateways', 'charter', 'icvs', 'org'] as const).map(tab => <button className={instituteView === tab ? 'active' : ''} key={tab} onClick={() => { setInstituteView(tab); setScope('MAX-INSTITUTE'); }}>{tab}</button>)}</div>
        {instituteView === 'gateways' ? <div className="gateway-list">{GATEWAYS.map(item => <button className={gateway === item.id ? 'active' : ''} key={item.id} onClick={() => { setGateway(item.id); setScope('MAX-INSTITUTE'); }}><strong>{item.id} · {item.label}</strong><small>{item.role}</small></button>)}</div> : <p className="institute-copy"><strong>{instituteView === 'charter' ? 'Charter' : instituteView === 'icvs' ? 'ICVs' : 'Organization'}</strong>{instituteView === 'charter' ? ': Public browsing remains free; the stated stack excludes R2, Stripe and Bitcoin.' : instituteView === 'icvs' ? ': Conceptual internal cognitive/value pathways. No unconfigured agent or memory service is represented as live.' : ': Connects the MAX modules, with scope navigation handled locally in this HUD.'}</p>}</aside>
      <main className="hud-center">
        {scope === 'MAX-SPORTS' && showVideo && <section className="hud-card video-card"><div className="video-heading"><strong>MAX-SPORTS · HLS VIDEO STAGE</strong><span>{streamStatus}</span></div><form className="stream-form" onSubmit={event => { event.preventDefault(); attachVideo(); }}><input aria-label="HLS stream URL" type="url" value={streamUrl} onChange={event => setStreamUrl(event.target.value)} placeholder="https://…/stream.m3u8"/><button type="submit">Attach stream</button><button type="button" className="quiet-button" onClick={() => { setStreamUrl(''); attachVideo(''); }}>Clear</button></form><video ref={video} controls playsInline aria-label="MAX-SPORTS live HLS video"/><div className="telemetry-row"><span>STREAM <b>{streamUrl ? 'URL entered' : 'not configured'}</b></span><span>TELEMETRY <b>Awaiting configured feed</b></span><span>ROUTING <b>Browser-local</b></span></div></section>}
        <section className="hud-card response-stream" aria-label="Command response stream">{entries.map(item => <article key={item.id} className={`stream-entry ${item.sender.toLowerCase()}`}><div><span>{item.sender} · {item.scope}</span><time>{item.time}</time></div><h3>{item.heading}</h3>{item.points.length > 0 && <ul>{item.points.map((point, index) => <li key={index}>{point}</li>)}</ul>}</article>)}</section>
        <section className="hud-card command-dock"><div className="quick-commands">{QUICK.map(item => <button key={item} onClick={() => execute(item)}>{item}</button>)}</div><form className="command-form" onSubmit={event => { event.preventDefault(); execute(); }}><span aria-hidden="true">&gt;</span><input aria-label="Command or natural-language prompt" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'ArrowUp') { event.preventDefault(); if (!history.length) return; const next = Math.min(cursor + 1, history.length - 1); setCursor(next); setInput(history[next]); } else if (event.key === 'ArrowDown') { event.preventDefault(); if (cursor > 0) { setCursor(cursor - 1); setInput(history[cursor - 1]); } else if (cursor === 0) { setCursor(-1); setInput(''); } } }} placeholder="Run a slash command or type a prompt…"/><button type="submit">Execute ↗</button></form><small>Enter to run · ↑/↓ command history · natural-language scope routing is deterministic</small></section>
      </main>
      <aside className="hud-card context-card"><h2>CONTEXT &amp; SPACE</h2><div className="context-block"><b>Active scope</b><span>{scope}</span><b>Focused gateway</b><span>{activeGateway.id} · {activeGateway.label}</span><small>{activeGateway.role}</small></div><div className="context-block"><b>Instant Digital Space</b><input value={spaceTitle} onChange={event => setSpaceTitle(event.target.value)} aria-label="Instant space title"/><textarea rows={3} value={spaceNotes} onChange={event => setSpaceNotes(event.target.value)} aria-label="Instant space notes"/><button onClick={() => { setScope('INSTANT-SPACE'); addEntry('COMMAND_HUD', 'INSTANT-SPACE', `${spaceTitle} active`, [spaceNotes]); }}>Open space</button></div><div className="context-block release-block"><b>Release anchor</b><span>The Crown of Return</span><small>3c8ee1c4-79b8-4bfd-be18-430679f452f2</small><span>30.00 USDC · 500 editions</span><small>Cover URL: /assets/crown-cover.png</small><small>Public media browsing stays open; checkout only applies to eligible paid releases.</small></div><button className="toggle-video" onClick={() => setShowVideo(value => !value)}>{showVideo ? 'Hide' : 'Show'} HLS video screen</button></aside>
    </div>
  </div>;
}
