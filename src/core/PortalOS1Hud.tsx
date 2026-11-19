import React, { useEffect, useRef, useState } from 'react';
import './PortalOS1Hud.css';

type Scope = 'BEEMAX' | 'MAX-ECOSYSTEM' | 'MAX-INSTITUTE' | 'MAX-MEDIA' | 'MAX-SPORTS' | 'MAX-SPACES' | 'MAX-SOVEREIGN';
type Entry = { command: string; result: string };
const scopes: Scope[] = ['BEEMAX', 'MAX-ECOSYSTEM', 'MAX-INSTITUTE', 'MAX-MEDIA', 'MAX-SPORTS', 'MAX-SPACES', 'MAX-SOVEREIGN'];
const instituteSections = ['Charter', 'ICVs', 'Organization', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
const help = 'Commands: /scope <name>, /gateway <G1–G7>, /media, /state, /help, /clear. Natural-language prompts route to a matching public scope; open-ended BEEMAX drafting remains in the existing operator assistant.';

function routePrompt(text: string): Scope | null {
  const value = text.toLowerCase();
  if (/\b(beemax|assistant|chat|draft|reason)\b/.test(value)) return 'BEEMAX';
  if (/\b(institute|charter|icv|gateway|organization|org)\b/.test(value)) return 'MAX-INSTITUTE';
  if (/\b(media|film|video|release)\b/.test(value)) return 'MAX-MEDIA';
  if (/\b(sports|sport|match|telemetry|hls)\b/.test(value)) return 'MAX-SPORTS';
  if (/\b(space|spaces|room|instant digital space)\b/.test(value)) return 'MAX-SPACES';
  if (/\b(sovereign|wallet|identity)\b/.test(value)) return 'MAX-SOVEREIGN';
  if (/\b(ecosystem|internet|public|browse)\b/.test(value)) return 'MAX-ECOSYSTEM';
  return null;
}

export default function PortalOS1Hud() {
  const [scope, setScope] = useState<Scope>('MAX-ECOSYSTEM');
  const [gateway, setGateway] = useState('G1');
  const [draft, setDraft] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [entries, setEntries] = useState<Entry[]>([{ command: 'SYSTEM', result: 'BEEMAX-PORTAL-OS1 ready. Public browsing is open; no operator sign-in or wallet funding is required.' }]);
  const [streamUrl, setStreamUrl] = useState('');
  const [streamActive, setStreamActive] = useState(false);
  const [hlsReady, setHlsReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!streamActive || !streamUrl || !video.current) return;
    const element = video.current;
    if (element.canPlayType('application/vnd.apple.mpegurl')) {
      element.src = streamUrl;
      return () => { element.removeAttribute('src'); element.load(); };
    }
    const global = window as Window & { Hls?: new (options?: unknown) => { loadSource: (url: string) => void; attachMedia: (media: HTMLMediaElement) => void; destroy: () => void } };
    const attach = () => {
      if (!global.Hls || !video.current) return;
      const player = new global.Hls();
      player.loadSource(streamUrl);
      player.attachMedia(video.current);
      return player;
    };
    if (global.Hls) {
      const player = attach();
      return () => player?.destroy();
    }
    const script = document.querySelector<HTMLScriptElement>('script[data-portal-hls]') ?? document.createElement('script');
    if (!script.src) {
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
      script.async = true;
      script.dataset.portalHls = 'true';
      document.head.appendChild(script);
    }
    const onLoad = () => setHlsReady(true);
    script.addEventListener('load', onLoad);
    return () => script.removeEventListener('load', onLoad);
  }, [streamActive, streamUrl, hlsReady]);

  function run(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setHistory(items => [...items, text].slice(-50));
    setHistoryIndex(-1);
    const words = text.split(/\s+/);
    const command = words[0].toLowerCase();
    let result = '';
    if (command === '/clear') { setEntries([]); setDraft(''); return; }
    if (command === '/help') result = help;
    else if (command === '/state') result = JSON.stringify({ scope, gateway, publicBrowsing: true, operatorSignInRequired: false, walletFundingRequired: false }, null, 2);
    else if (command === '/media') { setScope('MAX-MEDIA'); result = 'Scope set to MAX-MEDIA. Public releases remain browseable; payment checks apply only to eligible paid releases.'; }
    else if (command === '/scope') {
      const requested = words.slice(1).join('-').toUpperCase();
      const match = scopes.find(item => item === requested || item.replace('MAX-', '') === requested);
      if (match) { setScope(match); result = `Scope set to ${match}.`; }
      else result = `Choose a scope: ${scopes.join(', ')}.`;
    } else if (command === '/gateway') {
      const requested = (words[1] || '').toUpperCase();
      if (/^G[1-7]$/.test(requested)) { setGateway(requested); setScope('MAX-INSTITUTE'); result = `Selected ${requested} in MAX-INSTITUTE. Gateway selection is local UI state; no backend action was performed.`; }
      else result = 'Choose a gateway from G1 through G7.';
    } else {
      const target = routePrompt(text);
      if (target) { setScope(target); result = `Routed locally to ${target}. This command HUD does not send prompts to an AI model or execute backend actions.`; }
      else result = 'No deterministic scope matched. Try /help or choose a quick chip. Open-ended AI drafting is handled separately by the operator BEEMAX assistant.';
    }
    setEntries(items => [...items, { command: text, result }].slice(-50));
    setDraft('');
  }

  return <main className="portal-hud">
    <header className="portal-hud-header"><a className="portal-hud-brand" href="/">✳ PORTAL-OS1 <span>BEEMAX COMMAND HUD</span></a><span className="public-badge"><i/> PUBLIC · FREE BROWSING</span><a className="operator-link" href="/#/admin">Operator sign-in ↗</a></header>
    <div className="portal-hud-layout">
      <aside className="portal-hud-rail"><p className="hud-label">SCOPES</p>{scopes.map(item => <button key={item} className={scope === item ? 'selected' : ''} onClick={() => setScope(item)}>{item}</button>)}<p className="hud-note">Public MAX-INTERNET pages stay open. Only eligible paid releases use collector checkout.</p></aside>
      <section className="portal-hud-main"><div className="hud-title"><div><span className="hud-label">COMMAND SURFACE / PUBLIC ROUTING</span><h1>{scope}</h1></div><span className="gateway-pill">{scope === 'MAX-INSTITUTE' ? `GATEWAY ${gateway}` : 'LOCAL ROUTER'}</span></div>
        <div className="scope-panel">
          {scope === 'MAX-INSTITUTE' ? <><h2>Institute directory</h2><p>Charter, ICVs, organization and gateway navigation.</p><div className="institute-grid">{instituteSections.map(item => <button key={item} className={item === gateway ? 'selected' : ''} onClick={() => /^G[1-7]$/.test(item) && setGateway(item)}>{item}</button>)}</div></> : scope === 'MAX-SPORTS' ? <><h2>MAX-SPORTS · Live video & telemetry</h2><p>Paste a direct HLS .m3u8 URL to play. No stream URL or live telemetry feed is configured by this view.</p><form className="stream-form" onSubmit={event => { event.preventDefault(); setStreamActive(Boolean(streamUrl.trim())); }}><input aria-label="HLS stream URL" type="url" placeholder="https://example.com/live/stream.m3u8" value={streamUrl} onChange={event => setStreamUrl(event.target.value)} /><button type="submit">Load stream</button></form><video ref={video} controls playsInline aria-label="MAX-SPORTS HLS video"/><div className="telemetry-cards"><div><small>STREAM</small><strong>{streamActive ? 'Configured URL' : 'Not configured'}</strong></div><div><small>TELEMETRY</small><strong>Awaiting data source</strong></div><div><small>ROUTING</small><strong>Frontend only</strong></div></div></> : <><h2>{scope === 'MAX-SPACES' ? 'MAX-SPACES & Instant Digital Space' : scope === 'MAX-MEDIA' ? 'MAX-MEDIA public releases' : scope === 'BEEMAX' ? 'BEEMAX conversational assistant' : scope === 'MAX-SOVEREIGN' ? 'MAX-SOVEREIGN' : 'MAX public ecosystem'}</h2><p>{scope === 'MAX-MEDIA' ? 'Browse public media releases without signing in. Checkout remains isolated to paid releases.' : scope === 'BEEMAX' ? 'This HUD routes commands locally. For open-ended drafts and conversation, use the existing BEEMAX assistant in the operator command center.' : 'Navigate public MAX-INTERNET experiences. This view does not require operator authentication or wallet funding.'}</p><div className="scope-actions"><a href="/#/media">Browse MAX-MEDIA</a><a href="/#/sports">Open MAX-SPORTS</a><a href="/#/">Open public home</a></div></>}
        </div>
        <div className="quick-chips" aria-label="Quick commands">{['/help', '/state', '/scope MAX-INSTITUTE', '/gateway G1', '/media'].map(chip => <button key={chip} onClick={() => run(chip)}>{chip}</button>)}</div>
        <section className="command-console" aria-label="Command history"><div className="console-heading"><span>COMMAND LOG</span><button onClick={() => setEntries([])}>Clear log</button></div><div className="console-output" role="log" aria-live="polite">{entries.map((item, index) => <article key={`${index}-${item.command}`}><code>&gt; {item.command}</code><pre>{item.result}</pre></article>)}</div><form className="command-form" onSubmit={event => { event.preventDefault(); run(draft); }}><span aria-hidden="true">⌘</span><input aria-label="Command or natural-language prompt" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'ArrowUp') { event.preventDefault(); const next = Math.max(0, historyIndex < 0 ? history.length - 1 : historyIndex - 1); setHistoryIndex(next); setDraft(history[next] || ''); } else if (event.key === 'ArrowDown') { event.preventDefault(); const next = Math.min(history.length, historyIndex + 1); setHistoryIndex(next); setDraft(history[next] || ''); } }} placeholder="Type a command or ask to open a scope…"/><button type="submit">Run ↗</button></form><small className="command-hint">Enter to run · ↑/↓ command history · routing and state changes are deterministic in this browser</small></section>
      </section>
    </div>
  </main>;
}
