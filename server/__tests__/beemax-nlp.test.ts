import { describe, expect, it, vi } from 'vitest';
import app from '../../index';

function database(count = 0, failWrite = false) {
  const writes: unknown[][] = [];
  const prepare = vi.fn((sql: string) => {
    if (sql.startsWith('SELECT COUNT')) return { first: async () => ({ count }) };
    return { bind: (...values: unknown[]) => ({ run: async () => {
      if (failWrite) throw new Error('database unavailable');
      writes.push(values);
    } }) };
  });
  return { DB: { prepare }, writes };
}

async function send(body: unknown, env: unknown, origin = 'http://localhost') {
  return app.request('/api/beemax/nlp', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, env as never);
}

describe('BEEMAX natural language queries', () => {
  it.each([
    ['diagnostic sweep', 'SYSTEM_DIAGNOSTIC', 'Node telemetry reports 0 active nodes.'],
    ['show catalog', 'CATALOG_QUERY', 'The catalog contains 0 artworks.'],
    ['escrow settlement', 'ESCROW_QUERY', 'Escrow release is not connected to this command interface.'],
    ['hello', 'INTENT_AS_CODE', 'Query received. Try asking about node status, the catalog, or escrow.'],
  ])('routes %s without inventing status', async (query, actionType, reply) => {
    const env = database();
    const response = await send({ query }, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, actionType, reply });
    expect(env.writes).toHaveLength(1);
    expect(env.writes[0]).toEqual([expect.stringMatching(/^evt_nlp_/), actionType, actionType, expect.stringMatching(/^[a-f0-9]{64}$/)]);
  });

  it('hashes Unicode queries as UTF-8 and does not assign a fabricated actor', async () => {
    const env = database(4);
    const query = 'catalog 🎨';
    const response = await send({ query }, env);
    expect(await response.json()).toMatchObject({ reply: 'The catalog contains 4 artworks.' });
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(query))), byte => byte.toString(16).padStart(2, '0')).join('');
    expect(env.writes[0][3]).toBe(hash);
    expect(env.DB.prepare).toHaveBeenCalledWith(expect.stringContaining('VALUES (?, \'nlp_command\', ?, ?, NULL, ?)'));
  });

  it('rejects invalid and cross-origin requests without writing', async () => {
    const env = database();
    expect((await send({ query: '  ' }, env)).status).toBe(400);
    expect((await send({ query: 'x'.repeat(2001) }, env)).status).toBe(400);
    expect((await send({ query: 'catalog' }, env, 'https://other.example')).status).toBe(403);
    expect(env.DB.prepare).not.toHaveBeenCalled();
  });

  it('reports an unavailable service if the audit write fails', async () => {
    const env = database(2, true);
    const response = await send({ query: 'catalog' }, env);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, error: 'BEEMAX query is unavailable.' });
  });
});
