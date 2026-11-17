import { describe, expect, it, vi } from 'vitest';
import worker from '../../src/worker';

const context = {} as ExecutionContext;

function environment(fetch: ReturnType<typeof vi.fn>) {
  return { ASSETS: { fetch } } as never;
}

describe('Worker routing', () => {
  it('serves existing assets with the original request', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('asset', { headers: { 'content-type': 'text/css' } }));
    const request = new Request('https://example.com/assets/style.css?v=1');
    const response = await worker.fetch(request, environment(fetch), context);

    expect(await response.text()).toBe('asset');
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(request);
  });

  it.each(['404', 'throw'])('falls back to the root on an asset %s', async (failure) => {
    const fetch = vi.fn();
    if (failure === '404') fetch.mockResolvedValueOnce(new Response('missing', { status: 404 }));
    else fetch.mockRejectedValueOnce(new Error('asset lookup failed'));
    fetch.mockResolvedValueOnce(new Response('SPA shell'));
    const request = new Request('https://example.com/admin/settings?tab=users', { headers: { Accept: 'text/html' } });
    const response = await worker.fetch(request, environment(fetch), context);

    expect(await response.text()).toBe('SPA shell');
    const fallback = fetch.mock.calls[1][0] as Request;
    expect(fallback.url).toBe('https://example.com/');
    expect(fallback.method).toBe('GET');
    expect(fallback.headers.get('accept')).toBe('text/html');
  });

  it('preserves HEAD when falling back and does not hide other errors', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 })).mockResolvedValueOnce(new Response(null));
    await worker.fetch(new Request('https://example.com/deep', { method: 'HEAD' }), environment(fetch), context);
    expect((fetch.mock.calls[1][0] as Request).method).toBe('HEAD');

    const failed = vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));
    const response = await worker.fetch(new Request('https://example.com/deep'), environment(failed), context);
    expect(response.status).toBe(503);
    expect(failed).toHaveBeenCalledOnce();
  });

  it('does not retry writes as requests to the SPA shell', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('missing', { status: 404 }));
    const response = await worker.fetch(new Request('https://example.com/deep', { method: 'POST', body: 'data' }), environment(fetch), context);
    expect(response.status).toBe(404);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('routes both API namespaces to the existing Hono app', async () => {
    const fetch = vi.fn();
    const env = { ASSETS: { fetch }, DB: { prepare: () => ({ all: async () => ({ results: [] }) }) } } as never;
    const status = await worker.fetch(new Request('https://example.com/api/status'), env, context);
    expect((await status.json()).status).toBe('nominal');
    const chess = await worker.fetch(new Request('https://example.com/v1/dat/chess/list'), env, context);
    expect(await chess.json()).toEqual({ success: true, games: [] });
    for (const path of ['/api/missing', '/v1/missing']) {
      const response = await worker.fetch(new Request(`https://example.com${path}`), env, context);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Not found' });
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
