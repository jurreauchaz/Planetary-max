export interface Bindings {
  DB: D1Database;
  ASSETS: Fetcher;
  SESSION_KV: KVNamespace;
  NODE_REGISTRY: DurableObjectNamespace;
  BEEMAX_SECURE_REGISTRY: DurableObjectNamespace;
  ENVIRONMENT?: string;
  PROTOCOL_VERSION?: string;
}
