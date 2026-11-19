```tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

type ScopeKey = "BEEMAX" | "MAX-ECOSYSTEM" | "MAX-INSTITUTE" | "MAX-MEDIA" | "MAX-SPORTS" | "MAX-CHESS" | "MAX-SPACES" | "Instant Digital Space" | "MAX-COMPUTE" | "P2P-COMPUTE" | "MAX-FINANCE" | "MAX-SOVEREIGN";

interface FeedItem {
  item_id?: string;
  id?: string;
  title: string;
  status?: string;
  summary: string;
  meta?: string;
  formula?: string;
  url?: string;
  source?: string;
  scope?: string;
}

interface FeedsPayload {
  sports?: FeedItem[];
  chess?: FeedItem[];
  max_math?: FeedItem[];
  max_physics?: FeedItem[];
  items?: FeedItem[];
  source?: string;
  cached?: boolean;
}

const SCOPES: ScopeKey[] = ["BEEMAX", "MAX-ECOSYSTEM", "MAX-INSTITUTE", "MAX-MEDIA", "MAX-SPORTS", "MAX-CHESS", "MAX-SPACES", "Instant Digital Space", "MAX-COMPUTE", "P2P-COMPUTE", "MAX-FINANCE", "MAX-SOVEREIGN"];
const GATEWAYS = ["G1: Charter & Sovereign Mandate", "G2: ICV Architecture", "G3: Organizational Topology", "G4: MAX MATH & MAX PHYSICS Feed", "G5: MAX-COMPUTE & P2P Compute", "G6: MAX-FINANCE & Reinvestment Ledger", "G7: MAX-INTERNET Free Discovery"];
const RELEASE_ID = "3c8ee1c4-79b8-4bfd-be18-430679f452f2";

export const BeemaxPortalCommandHud: React.FC = () => {
  const [scope, setScope] = useState<ScopeKey>("BEEMAX");
  const [gateway, setGateway] = useState<string>(GATEWAYS[0]);
  const [feedScope, setFeedScope] = useState("ALL");
  const [feeds, setFeeds] = useState<FeedsPayload>({});
  const [feedError, setFeedError] = useState("");
  const [streamInput, setStreamInput] = useState("");
  const [activeStream, setActiveStream] = useState("");
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [walletOptInRequested, setWalletOptInRequested] = useState(false);
  const [scratchpad, setScratchpad] = useState("");
  const [logLines, setLogLines] = useState<string[]>([
    "[BEEMAX-PORTAL-OS1] Wallet-free mode active. Public MAX-INTERNET access is free.",
    "[LEDGER] Base USDC bookkeeping only; R2, Stripe, and Bitcoin excluded.",
  ]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const refreshFeeds = async (filter = feedScope) => {
    setFeedError("");
    try {
      const response = await fetch(`/api/internet-feeds?scope=${encodeURIComponent(filter)}`, { headers: { Accept: "application/json" } });
      const data = await response.json() as FeedsPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "Internet feeds are unavailable.");
      setFeeds(data);
    } catch (error) { setFeedError(error instanceof Error ? error.message : "Internet feeds are unavailable."); }
  };

  useEffect(() => { void refreshFeeds("ALL"); }, []);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (activeStream && video.canPlayType("application/vnd.apple.mpegurl")) video.src = activeStream;
    else if (activeStream && Hls.isSupported()) {
      const hls = new Hls(); hls.loadSource(activeStream); hls.attachMedia(video);
      return () => hls.destroy();
    }
    return () => { video.pause(); video.removeAttribute("src"); };
  }, [activeStream]);

  const appendLog = (line: string) => setLogLines(previous => [...previous.slice(-79), line]);
  const runCommand = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setHistory(previous => [trimmed, ...previous.slice(0, 49)]); setHistoryIdx(-1);
    const lower = trimmed.toLowerCase();
    if (lower === "/clear") { setLogLines([]); return; }
    if (lower === "/help") { appendLog("Commands: /scope <name> | /gateway <1-7> | /space instant | /media | /state | /clear"); return; }
    if (lower === "/state") { appendLog(`STATE -> scope=${scope} | gateway=\"${gateway}\" | walletMode=${walletOptInRequested ? "opt-in-ready" : "wallet-free"} | stream=${activeStream || "none"}`); return; }
    if (lower === "/media") { setScope("MAX-MEDIA"); appendLog("Switched to MAX-MEDIA HLS.js stage."); return; }
    if (lower === "/space instant") { setScope("Instant Digital Space"); appendLog("Opened Instant Digital Space view."); return; }
    if (lower.startsWith("/scope ")) {
      const target = SCOPES.find(item => item.toLowerCase() === trimmed.slice(7).trim().toLowerCase());
      if (target) { setScope(target); appendLog(`Scope set to ${target}.`); } else appendLog(`Unknown scope \"${trimmed.slice(7).trim()}\".`);
      return;
    }
    if (lower.startsWith("/gateway ")) {
      const index = Number(trimmed.slice(9).trim()) - 1;
      if (Number.isInteger(index) && index >= 0 && index < GATEWAYS.length) { setScope("MAX-INSTITUTE"); setGateway(GATEWAYS[index]); appendLog(`Active gateway: ${GATEWAYS[index]}.`); }
      else appendLog("Gateway index must be 1 through 7.");
      return;
    }
    appendLog(`[PROMPT:${scope}] ${trimmed} (local HUD only; no backend action was performed)`);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") { event.preventDefault(); runCommand(command); setCommand(""); }
    else if (event.key === "ArrowUp") { event.preventDefault(); const next = Math.min(historyIdx + 1, history.length - 1); if (next >= 0) { setHistoryIdx(next); setCommand(history[next]); } }
    else if (event.key === "ArrowDown") { event.preventDefault(); const next = historyIdx - 1; setHistoryIdx(next); setCommand(next < 0 ? "" : history[next]); }
  };

  const feedItems = useMemo(() => feeds.items || [...(feeds.sports || []), ...(feeds.chess || []), ...(feeds.max_math || []), ...(feeds.max_physics || [])], [feeds]);
  return (
    <section aria-label="BEEMAX-PORTAL-OS1 Command HUD">
      <header><a href="/">✳ BEEMAX-PORTAL-OS1</a><span>PUBLIC · FREE BROWSING</span><a href="/#/admin">Operator sign-in</a>
        <h1>MAX-INTERNET Gateway</h1>
        <p>Active Scope: <strong>{scope}</strong> | Wallet Mode: <strong>{walletOptInRequested ? "Opt-In Requested" : "Wallet-Free Default"}</strong></p>
        <button type="button" onClick={() => setWalletOptInRequested(value => !value)}>{walletOptInRequested ? "Return to Wallet-Free Mode" : "Opt-In Wallet (When Ready)"}</button>
      </header>
      <nav aria-label="Portal Scopes">{SCOPES.map(item => <button key={item} type="button" onClick={() => setScope(item)}>{item}</button>)}</nav>
      <section><h2>Release Anchor &amp; Cover Asset</h2><p>The Crown of Return (<code>{RELEASE_ID}</code>) — 30.00 USDC — 500 editions</p><img src="/assets/crown-cover.png" alt="The Crown of Return Cover" width={160} height={220} /></section>
      <section><h2>MAX-INSTITUTE Gateways (G1–G7)</h2><select value={gateway} onChange={event => setGateway(event.target.value)}>{GATEWAYS.map(item => <option key={item}>{item}</option>)}</select></section>
      <section><h2>HLS.js Live Stream Stage</h2><input type="url" placeholder="https://example.com/live/stream.m3u8" value={streamInput} onChange={event => setStreamInput(event.target.value)} /><button type="button" onClick={() => { try { const parsed = new URL(streamInput.trim()); if (parsed.protocol !== "https:" || !/\.m3u8(?:$|[?#])/i.test(parsed.href)) throw new Error(); setActiveStream(parsed.href); appendLog(`Attached stream: ${parsed.href}`); } catch { setActiveStream(""); appendLog("Enter a valid HTTPS .m3u8 stream URL."); } }}>Attach Stream</button><video ref={videoRef} controls playsInline width={480} height={270} /></section>
      <section><h2>Live / Seeded Feeds</h2><label>Scope <select value={feedScope} onChange={event => { setFeedScope(event.target.value); void refreshFeeds(event.target.value); }}><option>ALL</option><option>MAX-INSTITUTE</option><option>MAX-INTERNET</option></select></label><button type="button" onClick={() => void refreshFeeds()}>Refresh</button>{feedError && <p role="alert">{feedError}</p>}<p>{feedItems.length} items · {feeds.cached ? "cached" : "live"} {feeds.source ? `· ${feeds.source}` : ""}</p><ul>{feedItems.map((item, index) => <li key={item.item_id || item.id || `${item.title}-${index}`}><strong>{item.title}</strong>{item.status ? ` [${item.status}]` : ""} — {item.summary}{item.formula && <p><code>{item.formula}</code></p>}{item.url && <p><a href={item.url} target="_blank" rel="noreferrer">Open source</a></p>}</li>)}</ul></section>
      <section><h2>Command Line &amp; History</h2><div>{["/state", "/help", "/space instant", "/media", "/clear"].map(chip => <button key={chip} type="button" onClick={() => runCommand(chip)}>{chip}</button>)}</div><input type="text" placeholder="/scope MAX-FINANCE, /gateway 4, /state, or a prompt" value={command} onChange={event => setCommand(event.target.value)} onKeyDown={handleKeyDown} /><pre>{logLines.join("\n")}</pre></section>
      <section><h2>Session Scratchpad</h2><textarea rows={5} placeholder="Notes, reinvestment tags, or match observations..." value={scratchpad} onChange={event => setScratchpad(event.target.value)} /></section>
    </section>
  );
};

export default BeemaxPortalCommandHud;
```