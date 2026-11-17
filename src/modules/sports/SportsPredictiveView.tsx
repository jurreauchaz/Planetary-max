import React, { useEffect, useState } from 'react';
type Metric = { id: string; league: string; matchup: string; metric_key: string | null; value: number | null; updated_at: string; oracle_consensus_json: string };
function eventSummary(json: string) {
  try {
    const event = JSON.parse(json);
    return [event.predictedWinner && `Predicted winner: ${event.predictedWinner}`, typeof event.confidenceScore === 'number' && `Confidence: ${event.confidenceScore}%`, typeof event.dataSourcesCount === 'number' && `Sources: ${event.dataSourcesCount}`].filter(Boolean).join(' · ') || 'No prediction recorded';
  } catch { return 'Prediction unavailable'; }
}
export default function SportsPredictiveView() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/telemetry', { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Telemetry unavailable');
        setMetrics(data.telemetry); setError('');
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Telemetry unavailable'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); const timer = window.setInterval(() => void load(), 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  return <section className="module-view"><div className="module-heading"><div><span className="eyebrow">03 / MAX-SPACE · ELITE SPORTS HUD</span><h1>Performance <em>telemetry.</em></h1><p>Stored metrics refresh every 30 seconds. Initial training records are sample data.</p></div></div>
    {loading ? <p role="status">Loading telemetry…</p> : error ? <p role="alert">{error}</p> : !metrics.length ? <p>No telemetry recorded.</p> : <div className="workspace-grid">{metrics.map(metric => <article className="art-card" key={metric.id} style={{ padding: 24 }}><small>{metric.league}</small><h2>{metric.metric_key?.replaceAll('_', ' ') || metric.matchup}</h2><p>{metric.value ?? eventSummary(metric.oracle_consensus_json)}</p><p>{metric.matchup}</p><time>{metric.updated_at}</time></article>)}</div>}
  </section>;
}
