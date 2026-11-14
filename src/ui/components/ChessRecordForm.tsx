import React, { useState } from 'react';

interface ChessRecordFormProps {
  onSuccess?: () => void;
}

interface ApiResponse { success?: boolean; error?: string; game_id?: string }

export function ChessRecordForm({ onSuccess }: ChessRecordFormProps) {
  const [whitePlayer, setWhitePlayer] = useState('MaxJ');
  const [blackPlayer, setBlackPlayer] = useState('');
  const [openingTag, setOpeningTag] = useState('Ruy Lopez Closed');
  const [pgnData, setPgnData] = useState('');
  const [status, setStatus] = useState<{ loading: boolean; error?: string; success?: string }>({ loading: false });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ loading: true });
    const gameId = `game-${crypto.randomUUID()}`;
    try {
      const response = await fetch('/v1/dat/chess', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, whitePlayer: whitePlayer.trim(), blackPlayer: blackPlayer.trim(), openingTag: openingTag.trim(), pgnData: pgnData.trim() }),
      });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.success) throw new Error(data.error || 'Chess record submission failed.');
      setStatus({ loading: false, success: `Game ${data.game_id ?? gameId} was stored.` });
      setBlackPlayer('');
      setPgnData('');
      onSuccess?.();
    } catch (error) {
      setStatus({ loading: false, error: error instanceof Error ? error.message : 'Chess record submission failed.' });
    }
  };

  const inputClass = 'w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';
  return (
    <section className="mb-8 rounded-lg border border-cyan-500/30 bg-slate-900 p-6 font-mono text-slate-100">
      <h2 className="mb-4 text-lg font-bold text-cyan-300">Submit a chess PGN record</h2>
      {status.error && <p className="mb-3 text-sm text-red-300" role="alert">{status.error}</p>}
      {status.success && <p className="mb-3 text-sm text-emerald-300" role="status">{status.success}</p>}
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-300">White player<input className={inputClass} required maxLength={100} value={whitePlayer} onChange={(event) => setWhitePlayer(event.target.value)} /></label>
          <label className="text-xs text-slate-300">Black player<input className={inputClass} required maxLength={100} value={blackPlayer} onChange={(event) => setBlackPlayer(event.target.value)} /></label>
        </div>
        <label className="block text-xs text-slate-300">Opening tag (optional)<input className={inputClass} maxLength={100} value={openingTag} onChange={(event) => setOpeningTag(event.target.value)} /></label>
        <label className="block text-xs text-slate-300">PGN notation<textarea className={inputClass} required minLength={3} maxLength={50000} rows={5} value={pgnData} onChange={(event) => setPgnData(event.target.value)} placeholder="1. e4 e5 2. Nf3 Nc6 *" /></label>
        <p className="text-xs text-slate-400">The server checks required fields and size; it does not validate chess legality.</p>
        <button className="w-full rounded bg-cyan-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-50" type="submit" disabled={status.loading}>{status.loading ? 'Submitting…' : 'Save game record'}</button>
      </form>
    </section>
  );
}
