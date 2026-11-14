import { Hono } from 'hono';
import { apiRoutes } from './gateway/apiRoutes';
import { SovereignMeshDO } from './mesh/durable';
import type { SigningBindings } from './security/signingMiddleware';

export { SovereignMeshDO };

export type Bindings = {
  DB: D1Database;
  SOVEREIGN_MESH: DurableObjectNamespace;
  ENVIRONMENT: string;
  ROOT_IDENTITY: string;
  ART_IDENTITY: string;
  PERSONAL_LIQUIDITY_BPS: string;
  TREASURY_INGRESS_TOKEN?: string;
} & SigningBindings;

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => c.json({
  system: 'MAX SPACE — PORTAL-OS / BEEMAX Microkernel',
  environment: c.env.ENVIRONMENT,
  root: c.env.ROOT_IDENTITY,
  artAlias: c.env.ART_IDENTITY,
  pqcReady: false,
  storage: 'D1 + Durable Objects (no R2)',
}));

app.route('/', apiRoutes);
app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((error, c) => {
  console.error('PORTAL-OS request failed', error);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
