import React, { useState } from 'react';

interface SportsTelemetryFormProps { onSuccess?: () => void }
type League = 'NFL' | 'NBA' | 'MLB' | 'SOCCER' | 'MMA';
interface ApiResponse { success?: boolean; error?: string; event_id?: string }

export function SportsTelemetryForm({ onSuccess }: SportsTelemetryFormProps) {
  const [league, setLeague] = useState<League>('NFL');
  const [matchup, setMatchup] = useState('');
  const [predictedWinner, setPredictedWinner] = useState('');
  const [confidenceScore, setConfidenceScore] = useState('');
  const [dataSourcesCount, setDataSourcesCount] = useState('');
  const [status, setStatus] = useState<{ loading: boolean; error?: string; success?: string }>({ loading: false });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ loading: true });
    const eventId = `${league.toLowerCase()}-${crypto.randomUUID()}`;
    try {
      const response = await fetch('/v1/dat/sports', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, league, matchup: matchup.trim(), oracleConsensus: { predictedWinner: predictedWinner.trim(), confidenceScore: Number(confidenceScore), dataSourcesCount: Number(dataSourcesCount) } }),
      });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.success) throw new Error(data.error || 'Sports telemetry submission failed.');
      setStatus({ loading: false, success: `Telemetry ${data.event_id ?? eventId} was stored.` });
      setMatchup('');
      setPredictedWinner('');
      onSuccess?.();
    } catch (error) {
      setStatus({ loading: false, error: error instanceof Error ? error.message : 'Sports telemetry submission failed.' });
    }
  };

  const inputClass = 'w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';
  return (
    <section className="mb-8 rounded-lg border border-amber-500/30 bg-slate-900 p-6 font-mono text-slate-100">
      <h2 className="mb-4 text-lg font-bold text-amber-300">Submit sports telemetry</h2>
      {status.error && <p className="mb-3 text-sm text-red-300" role="alert">{status.error}</p>}
      {status.success && <p className="mb-3 text-sm text-emerald-300" role="status">{status.success}</p>}
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-xs text-slate-300">League<select className={inputClass} value={league} onChange={(event) => setLeague(event.target.value as League)}><option>NFL</option><option>NBA</option><option>MLB</option><option>SOCCER</option><option>MMA</option></select></label>
          <label className="text-xs text-slate-300 md:col-span-2">Matchup<input className={inputClass} required maxLength={200} value={matchup} onChange={(event) => setMatchup(event.target.value)} /></label>
        </div>
        <label className="block text-xs text-slate-300">Predicted winner<input className={inputClass} required maxLength={100} value={predictedWinner} onChange={(event) => setPredictedWinner(event.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-300">Confidence (%)<input className={inputClass} type="number" required min="0" max="100" step="0.1" value={confidenceScore} onChange={(event) => setConfidenceScore(event.target.value)} /></label>
          <label className="text-xs text-slate-300">Data sources<input className={inputClass} type="number" required min="1" max="1000" step="1" value={dataSourcesCount} onChange={(event) => setDataSourcesCount(event.target.value)} /></label>
        </div>
        <p className="text-xs text-slate-400">This records a user-entered prediction, not a verified live feed or financial advice.</p>
        <button className="w-full rounded bg-amber-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-50" type="submit" disabled={status.loading}>{status.loading ? 'Submitting…' : 'Save telemetry record'}</button>
      </form>
    </section>
  );
}
