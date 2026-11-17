import { describe, expect, it, vi } from 'vitest';
import app from '../../index';

describe.each([
  ['/api/artworks', 'artworks'],
  ['/api/telemetry', 'telemetry'],
])('%s JSON contract', (path, key) => {
  it.each([{ rows: [] }, { rows: [{ id: 'sample' }] }])('returns D1 rows as an array: $rows', async ({ rows }) => {
    const env = { DB: { prepare: vi.fn(() => ({ all: async () => ({ results: rows }) })) } };
    const response = await app.request(path, {}, env as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ success: true, [key]: rows });
  });

  it('returns a JSON error and empty array if D1 is unavailable', async () => {
    const response = await app.request(path, {}, {} as never);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, [key]: [], error: expect.any(String) });
  });
});
