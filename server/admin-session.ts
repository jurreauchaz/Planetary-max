// Each opaque session has its own Durable Object, reachable only through its Worker binding.
// Session records hold a password fingerprint so rotating the Dashboard secret invalidates them.
interface SessionStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  setAlarm(time: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}
interface SessionState { storage: SessionStorage }
interface SessionEnv { ADMIN_PASSWORD?: string }
interface SessionRecord { passwordFingerprint: string; expiresAt: number }
export const ADMIN_SESSION_TTL_MS = 4 * 60 * 60 * 1000;

export async function sha256Hex(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export class AdminSessionDO {
  constructor(private readonly state: SessionState, private readonly env: SessionEnv) {}

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.method !== 'POST' || !['/create', '/verify', '/revoke'].includes(path)) return new Response(null, { status: 404 });
    try {
      if (path === '/revoke') {
        await this.state.storage.delete('session');
        await this.state.storage.deleteAlarm();
        return new Response(null, { status: 204 });
      }
      const password = this.env.ADMIN_PASSWORD;
      if (!password || password.length > 1024) return new Response(null, { status: 503 });
      const fingerprint = await sha256Hex(password);
      if (path === '/create') {
        const input = await request.json() as { fingerprint?: unknown };
        if (input.fingerprint !== fingerprint) return new Response(null, { status: 401 });
        const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
        await this.state.storage.setAlarm(expiresAt);
        await this.state.storage.put<SessionRecord>('session', { passwordFingerprint: fingerprint, expiresAt });
        return new Response(null, { status: 204 });
      }
      const session = await this.state.storage.get<SessionRecord>('session');
      if (!session || session.expiresAt <= Date.now()) return new Response(null, { status: 401 });
      if (session.passwordFingerprint !== fingerprint) {
        await this.state.storage.delete('session');
        await this.state.storage.deleteAlarm();
        return new Response(null, { status: 401 });
      }
      return new Response(null, { status: 204 });
    } catch {
      return new Response(null, { status: 503 });
    }
  }

  async alarm(): Promise<void> {
    await this.state.storage.delete('session');
  }
}
