import app from './index';
import type { Bindings } from './server/types';

export async function handleShowroomRequest(request: Request, env: Bindings): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = '/api/telemetry';
  return app.fetch(new Request(url, request), env);
}
