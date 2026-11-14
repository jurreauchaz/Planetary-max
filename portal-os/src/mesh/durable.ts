export class SovereignMeshDO {
  private readonly state: DurableObjectState;
  constructor(state: DurableObjectState) { this.state = state; }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    if (url.pathname === '/lock') {
      const existing = await this.state.storage.get<string>('lock');
      if (existing) return Response.json({ locked: false }, { status: 409 });
      const token = crypto.randomUUID();
      await this.state.storage.put('lock', token);
      return Response.json({ locked: true, token }, { status: 201 });
    }
    if (url.pathname === '/unlock') {
      const body = await request.json<{ token?: unknown }>().catch(() => ({}));
      const existing = await this.state.storage.get<string>('lock');
      if (!existing || typeof body.token !== 'string' || body.token !== existing) return Response.json({ error: 'Lock token mismatch' }, { status: 409 });
      await this.state.storage.delete('lock');
      return Response.json({ unlocked: true });
    }
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
}
