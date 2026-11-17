import app, { BEEMAXSecureNodeRegistryDO, NodeRegistryDO } from '../index';
import type { Env } from '../index';

// Keep Durable Object classes exported from the deployed Worker entry point.
export { BEEMAXSecureNodeRegistryDO, NodeRegistryDO };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/') || pathname.startsWith('/v1/')) {
      return app.fetch(request, env, ctx);
    }

    // Only navigation-capable methods can fall back to the SPA shell.
    const canFallback = request.method === 'GET' || request.method === 'HEAD';
    try {
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404 || !canFallback) return response;
    } catch (error) {
      if (!canFallback) throw error;
    }
    return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
  },
};
