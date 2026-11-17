# BEEMAX & PORTAL-OS1 Unified Edge Repository

**Pre-Tier Index:** `IDX-PRETIER-001`  
**Protocol Doctrine:** `JURREAUISM / DAT ("Done All To That")`  
**Target Runtime:** Cloudflare Workers, SQLite-Backed Durable Objects & Cloudflare D1

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:77a60b14ae2e23ce220fc270eeffa08b78dedeb3b5fc32f1cd587266f201dccd -->

## Overview

The root Worker entry point is `src/worker.ts`, which exports the Hono app through `index.ts`. The Vite SPA provides MAX-ART, MAX-CHESS and the MAX-SPACE sports HUD. The root `schema.sql` is the complete, canonical Cloudflare D1 bootstrap for these workspaces, identity and node records, marketplace inventory, verified-payment delivery, and the Portal-OS1 DAT registry and treasury tables.

All Worker configurations consume the root `migrations/` directory. Historical migrations are retained as the upgrade path for existing databases; they are not alternative bootstrap schemas. Portal-OS1's former standalone schema has moved into `migrations/0018_portal_sovereign_core.sql`. Worker entry points, Durable Object migrations, configured database IDs and application contracts remain unchanged.

## Database setup

For an empty database, either import the canonical bootstrap or apply the migration chain:

```bash
# Option A: complete bootstrap, including samples and Wrangler baseline receipts.
npx wrangler d1 execute planetary_max_root_db --local --file schema.sql

# Option B: equivalent initialization using upgrade history.
npm run db:migrate:local
```

Use `schema.sql` only with an empty database. Its baseline receipts tell Wrangler which migrations are already included. For every existing database, apply outstanding migrations with `npm run db:migrate:local` (local) or `npm run db:migrate` (remote). Importing the bootstrap into a partially initialized database does not upgrade its tables.

The sample `Sovereign Genesis #1` has no supplied price and is reserved to prevent checkout. `active_revenue_stream` is sample telemetry, not confirmed earnings. <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:0a6cd1f3056938aebb3184224f74869e4ec7371ef3ad087efbd55df6b4cf55e3 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:e896f3c52bd385d69329be998bed44d2db2ff27ecdbc67577d0ee0d4af4458fe -->

Checkout amounts remain integer cents; confirmed payment records retain the existing verification requirements.

The root API exposes `/api/status`, `/api/artworks`, `/api/telemetry`, and chess snapshots through `GET /api/chess/game` and `POST /api/chess/move`. Artwork creation retains the existing creator, medium, price and provenance requirements. Chess writes require a same-origin request and a valid FEN; a snapshot does not establish legal move history.

<!-- /coderabbit-ai-generated:v1 -->

## Native MAX-SOVEREIGN / MAX-FINANCE settlement

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:5a43523b6414781177d3707581097edb1e072c00edb423920e04b2e58a1ddc6f -->

`POST /api/sovereign/credit-settle` records an authenticated native credit entry directly in D1. The existing `/api/sovereign/settle` endpoint provides the same operation and shares its idempotency keys. The canonical `index.ts` mounts the settlement router. No Stripe integration exists in this repository.

<!-- /coderabbit-ai-generated:v1 -->

Example JSON body:

```json
{"item_id":"MAX-FINANCE:activity-001","amount":100,"currency":"SOV_CREDIT","actor_id":"registered-node-id"}
```

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:d5ae884e9417700ba0563bbc494b9538d85fc5b8c0670bfc19866b64c2af59ff -->

Amounts are positive, safe integer minor credit units. Currency defaults to `SOV_CREDIT`; other currencies are rejected. `actor_id` is optional and, when supplied, must match the authenticated node. Native entries may refer to activities from any workspace; they do not require an artwork foreign key.

Recipient records may instead use `{"recipient_id":"recipient-1","amount":100,"memo":"art credit"}`. Recipient IDs are 1–100 characters and the optional memo is at most 500 characters. The response also includes `settlement_id`, `sender`, `recipient` and `memo`. Changing the recipient or memo while reusing an idempotency key returns 409. Migration `0020_native_recipients.sql` must be applied before using either request format.

<!-- /coderabbit-ai-generated:v1 -->

Use the registered-node Ed25519 request signature described in `server/middleware.ts`: `X-Max-Node-Id`, `X-Max-Node-Signature`, `X-Max-Timestamp` and a fresh `X-Max-Nonce`. Include an `Idempotency-Key` containing 8–128 letters, digits, underscores or hyphens. Retrying the same payload with the same key and a new signed nonce returns the original transaction ID and timestamp. Reusing a key with different data returns 409. Revoked or unknown nodes cannot settle.

A successful response includes `success`, `transaction_id`, `ledger: MAX-SOVEREIGN-EDGELOG`, `settlement: DIRECT_ATOMIC_D1`, `status: SETTLED_NATIVE` and the persisted timestamp. The atomic operation is a native ledger write; it does not debit a balance, transfer fiat or USDC, or unlock collector assets (`funds_transferred: false`). Existing verified-USDC fulfillment remains separate. The authenticated admin ledger includes native entries and their actors.

Migration `0019_native_settlement.sql` preserves existing transaction IDs, AUTOINCREMENT history, payment fields and status values while permitting the new native records. Apply migrations before using the route. `npm run db:check` verifies legacy upgrade preservation; `npm run test:native` exercises actual signed requests against disposable local Wrangler/D1 data and cleans up its synthetic node and transactions.


<!-- /coderabbit-ai-generated:v1 -->

After appending a migration, regenerate and verify the canonical file (requires Python 3):

```bash
python3 scripts/schema.py --write
npm run db:check
```

The check compares schema, constraints, indexes and seed state, verifies repeated initialization and foreign keys, and exercises API column requirements.

## Local preview and deployment

```bash
npm install
npm run db:migrate:local
npm run build
npx wrangler dev --port 8787
```

For production, configure the intended database bindings and Worker secrets, then run `npm run db:migrate` and `npm run deploy`. The Portal-OS1 and BEEMAX Core Workers have separate deployment configurations; use their respective `--config` paths and database names when applying the same migration chain.


<!-- /coderabbit-ai-generated:v1 -->