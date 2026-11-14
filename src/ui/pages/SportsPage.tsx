import React, { useEffect, useMemo, useState } from 'react';

const leagues = ['NFL', 'NBA', 'MLB', 'SOCCER', 'MMA'];
interface TelemetryItem {
  event_id: string;
  league: string;
  matchup: string;
  oracle_consensus: {
    predictedWinner?: string;
    confidenceScore?: number;
    dataSourcesCount?: number;
  };
  updated_at: string;
}

export default function SportsPage() {
  const [activeLeague, setActiveLeague] = useState('NFL');
  const [telemetry, setTelemetry] = useState<TelemetryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/v1/dat/sports/list', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { success?: boolean; telemetry?: TelemetryItem[]; error?: string };
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load sports telemetry.');
        setTelemetry(Array.isArray(data.telemetry) ? data.telemetry : []);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load sports telemetry.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const leagueTelemetry = useMemo(() => telemetry.filter((item) => item.league === activeLeague), [telemetry, activeLeague]);

  return (
    <div style={{ padding: '2rem', background: '#0a0a0c', color: '#f0f0f5', minHeight: '100%', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #222', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 300, letterSpacing: '2px' }}>MAX SPORTS</h1>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Sports telemetry records</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} aria-label="Select league">
          {leagues.map((league) => (
            <button key={league} type="button" aria-pressed={activeLeague === league} onClick={() => setActiveLeague(league)}
              style={{ background: activeLeague === league ? '#3b82f6' : '#1a1a22', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
              {league}
            </button>
          ))}
        </div>
      </header>
      {loading ? <p role="status">Loading sports telemetry…</p> : error ? <p role="alert">{error}</p> : leagueTelemetry.length === 0 ? (
        <section style={{ background: '#121216', border: '1px solid #222', padding: '2rem', borderRadius: '8px', color: '#aaa' }}>
          No {activeLeague} telemetry records are available. This view displays stored records; it is not connected to a live sports data provider.
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {leagueTelemetry.map((item) => (
            <article key={item.event_id} style={{ background: '#121216', border: '1px solid #333', padding: '1.25rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', fontSize: '0.8rem' }}><span>{item.league}</span><span>{item.updated_at}</span></div>
              <h2 style={{ margin: '1rem 0' }}>{item.matchup}</h2>
              <p>Predicted winner: {item.oracle_consensus?.predictedWinner ?? 'Not provided'}</p>
              <p>Confidence: {item.oracle_consensus?.confidenceScore ?? '—'}%</p>
              <p>Data sources: {item.oracle_consensus?.dataSourcesCount ?? '—'}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
