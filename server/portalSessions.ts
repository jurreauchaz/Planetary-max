import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from './types';

const sessionRoutes = new Hono<{ Bindings: Bindings }>();
const COOKIE_NAME = 'portal_node_id';
const MAX_BODY_BYTES = 48_000;

const TabSchema = z.object({
  id: z.string().min(1).max(100),
  url: z.string().min(1).max(2048),
  title: z.string().min(1).max(160),
  module: z.enum(['home', 'art', 'chess', 'sports', 'beemax', 'external']),
}).strict();
const SessionSchema = z.object({
  tabs: z.array(TabSchema).min(1).max(20),
  active_tab_id: z.string().min(1).max(100),
  secondary_tab_id: z.string().min(1).max(100).nullable(),
  tiling_mode: z.enum(['single', 'split-h', 'split-v']),
}).strict().superRefine((session, context) => {
  const ids = new Set(session.tabs.map((tab) => tab.id));
  if (ids.size !== session.tabs.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Tab IDs must be unique.' });
  if (!ids.has(session.active_tab_id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['active_tab_id'], message: 'Active tab must exist in tabs.' });
  if (session.secondary_tab_id !== null && !ids.has(session.secondary_tab_id)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['secondary_tab_id'], message: 'Secondary tab must exist in tabs.' });
  }
});

function getSessionId(cookieHeader: string | undefined): string | null {
  const match = cookieHeader?.match(/(?:^|;\\s*)portal_node_id=([a-f0-9-]{36})(?:;|$)/i);
  return match?.[1] ?? null;
}

function setSessionCookie(headers: Headers, nodeId: string, url: string) {
  const secure = new URL(url).protocol === 'https:' ? '; Secure' : '';
  headers.append('Set-Cookie', `${COOKIE_NAME}=${nodeId}; Path=/api/portal/session; HttpOnly; SameSite=Strict; Max-Age=31536000${secure}`);
  headers.set('Cache-Control', 'no-store');
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}

function jsonError(message: string, status: 400 | 403 | 413 | 503) {
  return Response.json({ success: false, error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

sessionRoutes.get('/api/portal/session', async (c) => {
  let nodeId = getSessionId(c.req.header('Cookie'));
  const newCookie = !nodeId;
  nodeId ??= crypto.randomUUID();

  try {
    const record = await c.env.DB.prepare(
      'SELECT tabs_json, active_tab_id, secondary_tab_id, tiling_mode, updated_at FROM portal_sessions WHERE node_id = ?'
    ).bind(nodeId).first<{ tabs_json: string; active_tab_id: string; secondary_tab_id: string | null; tiling_mode: string; updated_at: number }>();

    let session: z.infer<typeof SessionSchema> | null = null;
    if (record) {
      try {
        const tabs = JSON.parse(record.tabs_json) as unknown;
        const parsed = SessionSchema.safeParse({
          tabs,
          active_tab_id: record.active_tab_id,
          secondary_tab_id: record.secondary_tab_id,
          tiling_mode: record.tiling_mode,
        });
        if (parsed.success) session = parsed.data;
      } catch { /* Treat corrupt persisted state as an empty session. */ }
    }

    const headers = new Headers({ 'Cache-Control': 'no-store' });
    if (newCookie) setSessionCookie(headers, nodeId, c.req.url);
    return c.json({ success: true, session, updated_at: record?.updated_at ?? null }, 200, Object.fromEntries(headers));
  } catch (error) {
    console.error('Unable to load Portal browser session:', error);
    return jsonError('Portal session storage is unavailable.', 503);
  }
});

sessionRoutes.put('/api/portal/session', async (c) => {
  if (!isSameOrigin(c.req.raw)) return jsonError('A same-origin request is required.', 403);
  const nodeId = getSessionId(c.req.header('Cookie'));
  if (!nodeId) return jsonError('Portal session cookie is missing. Reload the browser and retry.', 403);

  const contentLength = Number(c.req.header('Content-Length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return jsonError('Session payload is too large.', 413);

  let body: unknown;
  try {
    body = await c.req.json();
    if (new TextEncoder().encode(JSON.stringify(body)).byteLength > MAX_BODY_BYTES) return jsonError('Session payload is too large.', 413);
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }
  const parsed = SessionSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: 'Invalid Portal session.', details: parsed.error.flatten() }, 400, { 'Cache-Control': 'no-store' });

  const session = parsed.data;
  try {
    await c.env.DB.prepare(
      `INSERT INTO portal_sessions (node_id, tabs_json, active_tab_id, secondary_tab_id, tiling_mode, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(node_id) DO UPDATE SET
         tabs_json = excluded.tabs_json,
         active_tab_id = excluded.active_tab_id,
         secondary_tab_id = excluded.secondary_tab_id,
         tiling_mode = excluded.tiling_mode,
         updated_at = excluded.updated_at`
    ).bind(nodeId, JSON.stringify(session.tabs), session.active_tab_id, session.secondary_tab_id, session.tiling_mode, Date.now()).run();
    return c.json({ success: true, updated_at: Date.now() }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('Unable to save Portal browser session:', error);
    return jsonError('Portal session could not be saved.', 503);
  }
});

export default sessionRoutes;
