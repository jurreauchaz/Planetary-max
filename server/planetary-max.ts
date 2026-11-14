// Public read-only lists for the prototype Chess and Sports screens.
// Writes are intentionally not exposed until an authenticated publisher flow exists.
app.get('/v1/dat/chess/list', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT game_id, white_player, black_player, pgn_data, status, updated_at FROM chess_games ORDER BY updated_at DESC LIMIT 50'
    ).all();
    return c.json({ success: true, games: results ?? [] });
  } catch (error) {
    console.error('Failed to retrieve chess games:', error);
    return c.json({ success: false, error: 'Chess records are unavailable. Apply the chess and sports database migration.' }, 503);
  }
});

app.get('/v1/dat/sports/list', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT event_id, league, matchup, oracle_consensus_json, updated_at FROM sports_telemetry ORDER BY updated_at DESC LIMIT 50'
    ).all<{ event_id: string; league: string; matchup: string; oracle_consensus_json: string; updated_at: string }>();
    const telemetry = (results ?? []).map((row) => {
      let oracle_consensus: unknown = {};
      try { oracle_consensus = JSON.parse(row.oracle_consensus_json); } catch { /* Leave malformed legacy payload empty. */ }
      return { event_id: row.event_id, league: row.league, matchup: row.matchup, oracle_consensus, updated_at: row.updated_at };
    });
    return c.json({ success: true, telemetry });
  } catch (error) {
    console.error('Failed to retrieve sports telemetry:', error);
    return c.json({ success: false, error: 'Sports telemetry is unavailable. Apply the chess and sports database migration.' }, 503);
  }
});

app.all('*', async (c) => c.env.ASSETS.fetch(c.req.raw));
export default app;
