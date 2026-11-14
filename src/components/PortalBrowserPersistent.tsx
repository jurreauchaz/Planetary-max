import React, { useEffect, useState } from 'react';
import GalleryPage from '../ui/pages/GalleryPage';
import ChessPage from '../ui/pages/ChessPage';
import SportsPage from '../ui/pages/SportsPage';

interface Tab {
  id: string;
  url: string;
  title: string;
  module: 'home' | 'art' | 'chess' | 'sports' | 'beemax' | 'external';
}

type TilingMode = 'single' | 'split-h' | 'split-v';

const STORAGE_KEYS = {
  TABS: 'portal_os_tabs_v1',
  ACTIVE_TAB: 'portal_os_active_tab_v1',
  SECONDARY_TAB: 'portal_os_secondary_tab_v1',
  TILING: 'portal_os_tiling_mode_v1',
};

const DEFAULT_TABS: Tab[] = [
  { id: '1', url: 'max://core.portal-os.max', title: 'Portal-OS Gateway', module: 'home' },
  { id: '2', url: 'max://chess.node', title: 'MAX Chess', module: 'chess' },
];
const VALID_MODULES = new Set<Tab['module']>(['home', 'art', 'chess', 'sports', 'beemax', 'external']);
const VALID_TILING = new Set<TilingMode>(['single', 'split-h', 'split-v']);

function loadTabs(): Tab[] {
  if (typeof window === 'undefined') return DEFAULT_TABS;
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.TABS) ?? 'null');
    if (!Array.isArray(stored) || stored.length === 0 || stored.length > 20) return DEFAULT_TABS;
    const valid = stored.every((tab): tab is Tab => Boolean(
      tab && typeof tab === 'object' &&
      typeof tab.id === 'string' && typeof tab.url === 'string' &&
      typeof tab.title === 'string' && VALID_MODULES.has(tab.module),
    ));
    return valid ? stored : DEFAULT_TABS;
  } catch {
    return DEFAULT_TABS;
  }
}

function readStorage(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function persist(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, value); } catch { /* Storage can be disabled or full. */ }
}

function resolveAddress(address: string): Pick<Tab, 'url' | 'title' | 'module'> {
  const value = address.trim();
  if (value.toLowerCase() === 'max://') return { url: 'max://core.portal-os.max', title: 'Portal-OS Gateway', module: 'home' };
  if (!value) throw new Error('Enter an address.');

  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('Enter a valid max://, http://, or https:// address.'); }

  if (parsed.protocol === 'max:') {
    const host = parsed.hostname.toLowerCase();
    const routes: Record<string, Pick<Tab, 'title' | 'module'>> = {
      'core.portal-os.max': { title: 'Portal-OS Gateway', module: 'home' },
      'art.space': { title: 'MAX-Art Vault', module: 'art' },
      'chess.node': { title: 'MAX Chess', module: 'chess' },
      'sports.telemetry': { title: 'MAX Sports', module: 'sports' },
      'beemax.core': { title: 'BEEMAX Core', module: 'beemax' },
    };
    const route = routes[host];
    return route ? { url: value, ...route } : { url: value, title: host || 'External node', module: 'external' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only max://, http://, and https:// URLs are supported.');
  }
  if (parsed.origin === window.location.origin) {
    const route = ({ '/': ['Portal-OS Gateway', 'home'], '/gallery': ['MAX-Art Vault', 'art'], '/chess': ['MAX Chess', 'chess'], '/sports': ['MAX Sports', 'sports'] } as Record<string, [string, Tab['module']]>)[parsed.pathname.replace(/\/$/, '') || '/'];
    if (route) return { url: value, title: route[0], module: route[1] };
  }
  return { url: value, title: parsed.hostname || 'External site', module: 'external' };
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const PortalBrowserPersistent: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>(loadTabs);
  const [activeTabId, setActiveTabId] = useState(() => readStorage(STORAGE_KEYS.ACTIVE_TAB, '1'));
  const [secondaryTabId, setSecondaryTabId] = useState(() => readStorage(STORAGE_KEYS.SECONDARY_TAB, '2'));
  const [tilingMode, setTilingMode] = useState<TilingMode>(() => {
    const saved = readStorage(STORAGE_KEYS.TILING, 'single') as TilingMode;
    return VALID_TILING.has(saved) ? saved : 'single';
  });
  const [urlInput, setUrlInput] = useState('max://core.portal-os.max');
  const [error, setError] = useState<string | null>(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const secondaryTab = tabs.find((tab) => tab.id === secondaryTabId && tab.id !== activeTab?.id)
    ?? tabs.find((tab) => tab.id !== activeTab?.id)
    ?? activeTab;

  useEffect(() => persist(STORAGE_KEYS.TABS, JSON.stringify(tabs)), [tabs]);
  useEffect(() => persist(STORAGE_KEYS.ACTIVE_TAB, activeTabId), [activeTabId]);
  useEffect(() => persist(STORAGE_KEYS.SECONDARY_TAB, secondaryTabId), [secondaryTabId]);
  useEffect(() => persist(STORAGE_KEYS.TILING, tilingMode), [tilingMode]);
  useEffect(() => { if (activeTab) setUrlInput(activeTab.url); }, [activeTab?.id, activeTab?.url]);

  const navigate = (address: string, tabId = activeTab?.id) => {
    if (!tabId) return;
    try {
      const target = resolveAddress(address);
      setTabs((current) => current.map((tab) => tab.id === tabId ? { ...tab, ...target } : tab));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to resolve address.');
    }
  };

  const createTab = () => {
    if (tabs.length >= 20) { setError('Close a tab before opening another (maximum 20).'); return; }
    const id = makeId();
    const tab: Tab = { id, url: 'max://core.portal-os.max', title: 'New Portal', module: 'home' };
    setTabs((current) => [...current, tab]);
    setActiveTabId(id);
    setUrlInput(tab.url);
    setError(null);
  };

  const closeTab = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    if (tabs.length === 1) return;
    const remaining = tabs.filter((tab) => tab.id !== id);
    setTabs(remaining);
    if (activeTabId === id) setActiveTabId(remaining[0].id);
    if (secondaryTabId === id) setSecondaryTabId(remaining.find((tab) => tab.id !== activeTabId)?.id ?? remaining[0].id);
  };

  const openModule = (module: Exclude<Tab['module'], 'external'>) => {
    const urls: Record<Exclude<Tab['module'], 'external'>, string> = {
      home: 'max://core.portal-os.max', art: 'max://art.space', chess: 'max://chess.node',
      sports: 'max://sports.telemetry', beemax: 'max://beemax.core',
    };
    setUrlInput(urls[module]);
    navigate(urls[module]);
  };

  const renderModule = (tab: Tab) => {
    switch (tab.module) {
      case 'art': return <GalleryPage />;
      case 'chess': return <ChessPage />;
      case 'sports': return <SportsPage />;
      case 'home': return (
        <div className="space-y-4 p-6 text-slate-100">
          <section className="rounded-lg border border-purple-500/30 bg-purple-950/10 p-4">
            <h2 className="text-sm font-bold text-purple-300">Sovereign Edge Node Gateway</h2>
            <p className="mt-1 text-xs text-slate-400">Browser tabs, selected room, and tiling mode are saved in this browser’s local storage.</p>
          </section>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(['art', 'chess', 'sports', 'beemax'] as const).map((module) => (
              <button key={module} type="button" onClick={() => openModule(module)} className="rounded border border-slate-800 bg-slate-900/50 p-3 text-left hover:border-purple-500">
                <span className="text-xs font-bold">{module === 'art' ? 'MAX-Art Vault' : module === 'chess' ? 'MAX Chess' : module === 'sports' ? 'MAX Sports' : 'BEEMAX Core'}</span>
              </button>
            ))}
          </div>
        </div>
      );
      case 'beemax': return <div className="p-6 text-sm text-purple-300">BEEMAX Core is not embedded in this browser view.</div>;
      case 'external': return <div className="p-6 text-sm text-slate-300">External sites are not embedded. Address: {tab.url}</div>;
    }
  };

  const buttonClass = (selected: boolean) => `rounded px-2 py-1 text-[10px] ${selected ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`;

  if (!activeTab) return null;

  return (
    <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-xl border border-purple-500/40 bg-slate-950 font-mono text-slate-200 shadow-2xl" aria-label="Persistent Portal browser">
      <header className="flex items-center border-b border-purple-500/30 bg-slate-900">
        <div className="flex items-center gap-2 border-r border-slate-800 px-3 py-3" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /></div>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto px-2 py-1" role="tablist" aria-label="Browser tabs">
          {tabs.map((tab) => <div key={tab.id} role="tab" aria-selected={activeTabId === tab.id} tabIndex={0} onClick={() => setActiveTabId(tab.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setActiveTabId(tab.id); }} className={`flex cursor-pointer items-center gap-2 rounded-t-md border-t px-3 py-2 text-xs ${activeTabId === tab.id ? 'border-purple-500 bg-slate-950 font-bold text-purple-300' : 'border-transparent text-slate-400 hover:bg-slate-800'}`}>
            <span className="max-w-[120px] truncate">{tab.title}</span>
            {tabs.length > 1 && <button type="button" aria-label={`Close ${tab.title} tab`} onClick={(event) => closeTab(event, tab.id)} className="px-1 text-slate-500 hover:text-rose-400">×</button>}
          </div>)}
        </div>
        <button type="button" aria-label="New tab" onClick={createTab} className="px-3 text-sm text-slate-400 hover:text-cyan-400">+</button>
        <div className="flex gap-1 px-2">
          <button type="button" aria-pressed={tilingMode === 'single'} onClick={() => setTilingMode('single')} className={buttonClass(tilingMode === 'single')}>1×1</button>
          <button type="button" aria-pressed={tilingMode === 'split-h'} onClick={() => setTilingMode('split-h')} className={buttonClass(tilingMode === 'split-h')}>Split H</button>
          <button type="button" aria-pressed={tilingMode === 'split-v'} onClick={() => setTilingMode('split-v')} className={buttonClass(tilingMode === 'split-v')}>Split V</button>
        </div>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); navigate(urlInput); }} className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-2">
        <label htmlFor="portal-browser-url" className="text-xs text-cyan-400">Address</label>
        <input id="portal-browser-url" type="text" value={urlInput} onChange={(event) => setUrlInput(event.target.value)} className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-none" placeholder="max://chess.node" />
        <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-xs text-white">Go</button>
      </form>
      {error && <p role="alert" className="m-0 bg-red-950 px-4 py-2 text-xs text-red-300">{error}</p>}

      <div className={`grid min-h-[420px] bg-slate-950 ${tilingMode === 'split-h' ? 'grid-cols-2' : tilingMode === 'split-v' ? 'grid-rows-2' : 'grid-cols-1'}`}>
        <div className="min-w-0 overflow-auto border-r border-slate-900 p-2">
          <div className="flex justify-between rounded bg-slate-900/40 px-3 py-1 text-[10px] text-purple-400"><span>ACTIVE: {activeTab.title}</span><span>Storage: local</span></div>
          {renderModule(activeTab)}
        </div>
        {tilingMode !== 'single' && <div className="min-w-0 overflow-auto border-l border-slate-900 bg-slate-950/60 p-2">
          <div className="flex items-center justify-between gap-2 rounded bg-slate-900/40 px-3 py-1 text-[10px] text-cyan-400">
            <span>TILED: {secondaryTab?.title ?? 'No second tab'}</span>
            <select aria-label="Select tiled tab" value={secondaryTab?.id ?? ''} onChange={(event) => setSecondaryTabId(event.target.value)} className="max-w-[60%] rounded border border-slate-800 bg-slate-900 px-1 text-slate-300">
              {tabs.filter((tab) => tab.id !== activeTab.id).map((tab) => <option key={tab.id} value={tab.id}>{tab.title}</option>)}
              {tabs.length === 1 && <option value={activeTab.id}>{activeTab.title}</option>}
            </select>
          </div>
          {secondaryTab && renderModule(secondaryTab)}
        </div>}
      </div>

      <footer className="flex items-center justify-between border-t border-purple-500/30 bg-slate-900 px-4 py-2 text-[10px] text-slate-400">
        <span>Portal-OS · {tabs.length} tab{tabs.length === 1 ? '' : 's'} · {tilingMode}</span>
        <span className="text-purple-400">Tabs and layout persist in local storage</span>
      </footer>
    </section>
  );
};
