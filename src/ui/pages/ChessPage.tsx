import React, { useEffect, useState } from 'react';

interface ChessGame {
  game_id: string;
  white_player: string;
  black_player: string;
  pgn_data: string;
  status: string;
  updated_at: string;
}

export default function ChessPage() {
  const [games, setGames] = useState<ChessGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/v1/dat/chess/list', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { success?: boolean; games?: ChessGame[]; error?: string };
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load chess games.');
        setGames(Array.isArray(data.games) ? data.games : []);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load chess games.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <div style={{ padding: '2rem', background: '#0a0a0c', color: '#f0f0f5', minHeight: '100%', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #222', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 300, letterSpacing: '2px' }}>MAX CHESS</h1>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>Recorded games and PGN archive</p>
      </header>
      {loading ? <p role="status">Loading games…</p> : error ? <p role="alert">{error}</p> : games.length === 0 ? (
        <section style={{ padding: '2rem', background: '#121216', border: '1px solid #222', borderRadius: '12px', color: '#aaa' }}>
          No chess games have been recorded yet. This page currently displays game records; it is not an interactive chessboard.
        </section>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {games.map((game) => (
            <article key={game.game_id} style={{ padding: '1.25rem', background: '#121216', border: '1px solid #222', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>{game.white_player} <span style={{ color: '#888' }}>vs</span> {game.black_player}</h2>
                <span style={{ color: '#93c5fd' }}>{game.status}</span>
              </div>
              <p style={{ color: '#888', fontSize: '0.8rem' }}>Game {game.game_id} · Updated {game.updated_at}</p>
              <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#cbd5e1', background: '#09090b', padding: '1rem', borderRadius: '6px' }}>{game.pgn_data}</pre>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
