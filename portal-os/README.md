# MAX SPACE — PORTAL-OS

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:d86f936e21f098af2a8d59c5c543c7298aaf1c92984c119384252688097fea71 -->

A separate Cloudflare Worker for the sovereign DAT registry and treasury APIs. Its D1 schema is part of the root `schema.sql`; its upgrade history is the shared root `migrations/` directory. Worker deployment and Durable Object configuration remain separate.

## Run and deploy

1. Install dependencies from the repository root (`npm install`).
2. Verify `portal-os/wrangler.toml` points to the intended D1 database. Database selection is independent of the shared table definitions.
3. Set the ingress secret with `npx wrangler secret put TREASURY_INGRESS_TOKEN --config portal-os/wrangler.toml`.
4. Apply the shared migrations using `npx wrangler d1 migrations apply portal_os_sovereign_db --config portal-os/wrangler.toml --remote` and deploy using `npx wrangler deploy --config portal-os/wrangler.toml`.

For local work, replace `--remote` with `--local`. For an empty database, root `schema.sql` is an equivalent bootstrap including migration receipts; see the root README. Existing databases must use migrations. The former `portal-os/migrations/0001_max_sovereign_core.sql` now lives at `migrations/0018_portal_sovereign_core.sql`; its CREATE IF NOT EXISTS statements preserve an existing DAT registry.



<!-- /coderabbit-ai-generated:v1 -->Do not reuse the existing Worker’s database ID unless you have reviewed the schema and migration plan. This scaffold does not custody funds or execute blockchain transfers. The ingress route records a ledger allocation only. PQC algorithms are not implemented here; crypto agility reports them unavailable rather than claiming post-quantum protection. Add real identity/session authorization and independently reviewed settlement integrations before production use.

## Routes

- `GET /` — health and capability status.
- `GET /v1/dat/:datId` — asset and provenance lookup.
- `POST /v1/treasury/ingress` — validated ledger allocation; requires `Authorization: Bearer <TREASURY_INGRESS_TOKEN>`.
- `POST /v1/mesh/lock` and `POST /v1/mesh/unlock` — simple per-key Durable Object lock coordination; not a payment escrow.
