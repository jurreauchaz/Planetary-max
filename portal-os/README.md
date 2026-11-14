# MAX SPACE — PORTAL-OS

An isolated Cloudflare Worker scaffold for the sovereign DAT registry and treasury APIs. It lives under `portal-os/` so it does not replace the repository's existing Worker, D1 migrations, or Durable Object classes.

## Run and deploy

1. Install the repository dependencies from the root (`npm install`).
2. Create a separate D1 database for this Worker and replace `REPLACE_WITH_YOUR_D1_ID` in `portal-os/wrangler.toml`.
3. Set the ingress secret with `npx wrangler secret put TREASURY_INGRESS_TOKEN --config portal-os/wrangler.toml`.
4. Apply this Worker's migrations and deploy with `npx wrangler d1 migrations apply max-sovereign-core --config portal-os/wrangler.toml --remote` and `npx wrangler deploy --config portal-os/wrangler.toml`.

Do not reuse the existing Worker’s database ID unless you have reviewed the schema and migration plan. This scaffold does not custody funds or execute blockchain transfers. The ingress route records a ledger allocation only. PQC algorithms are not implemented here; crypto agility reports them unavailable rather than claiming post-quantum protection. Add real identity/session authorization and independently reviewed settlement integrations before production use.

## Routes

- `GET /` — health and capability status.
- `GET /v1/dat/:datId` — asset and provenance lookup.
- `POST /v1/treasury/ingress` — validated ledger allocation; requires `Authorization: Bearer <TREASURY_INGRESS_TOKEN>`.
- `POST /v1/mesh/lock` and `POST /v1/mesh/unlock` — simple per-key Durable Object lock coordination; not a payment escrow.
