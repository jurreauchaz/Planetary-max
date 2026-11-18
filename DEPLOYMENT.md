<!-- coderabbit-ai-generated:v1 -->

# Application deployment

The client is a React/Vite application served by the root Cloudflare Worker (`src/worker.ts`). Deploy the Worker and its built `dist` assets together. A static host alone cannot run the database, registry, or collector APIs.

## Requirements

- Node 24 or newer and npm. Use the committed `package-lock.json` with `npm ci`.
- Cloudflare access to the D1 database and KV namespace configured in `wrangler.toml`. Their supplied IDs are configured; a local dry run does not verify account ownership or resource existence.
- Worker secrets `ADMIN_PASSWORD_HASH` (64-character hex SHA-256 digest of a strong administrator password) and an independent `JWT_SECRET` of at least 32 bytes. Configure them through Cloudflare secrets, never through frontend variables or source control. The root Worker includes a native login rate limiter of 10 attempts per minute per reported client IP.

## Prepare and deploy

```bash
npm ci
npm run typecheck
npm test
npm run build
npx wrangler deploy --dry-run
```

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:bddbecd18c05e4a9a964bb0638431a7f6e177a55e88db34dd7871a296fb1b8b5 -->

### Create the administrator login

After `npm ci`, authenticate Wrangler to the Cloudflare account containing the `planetary-max` Worker. On your own trusted terminal, run:

```bash
npx wrangler login
npm run admin:setup -- --remote
```

Enter and confirm a unique password of at least 24 characters when prompted. Input is hidden. The command sends the password's SHA-256 hash and a freshly generated independent signing secret to the configured Worker in one Wrangler request; it does not save or display the password. Save your password in a password manager. This is a single password-based administrator login with no username. Open `/#/admin` on the deployed site to sign in. Running the command again changes the password, rotates the signing secret, and invalidates existing administrator sessions. Never put the password or secrets in chat or source control.

For a local Preview only, run `npm run admin:setup -- --local`. It creates an ignored `.dev.vars` with restricted permissions and refuses to overwrite an existing file. Restart the local Worker after creating it. Keep local and production passwords different. Existing `.dev.vars` files must be preserved or moved aside manually before creating new local credentials.

You may alternatively set `ADMIN_PASSWORD_HASH` and `JWT_SECRET` individually with `npx wrangler secret put`. The hash must be a 64-character SHA-256 hex digest of the exact UTF-8 password, and the signing secret must be independent and at least 32 bytes.

<!-- /coderabbit-ai-generated:v1 -->

After reviewing the target Cloudflare account, apply all pending migrations to the real database and deploy:

```bash
npm run db:migrate
npm run deploy
```

In Cloudflare Workers Builds, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. Wrangler serves `./dist`. The built `dist` directory is ignored in Git; generate it during each build. SPA paths use the application shell, while `/api/*` and `/v1/*` reach the Worker first and keep JSON errors.

Migrations 0016 and 0017 are required. Migration 0016 adds a catalog flag and hides the exact unchanged historical demo artwork records; it preserves the rows. Migration 0017 links new settlement receipts to paying wallets for access-link recovery. Back up the production database before migration. No remote migration or deployment was performed during this task.

## Populate the application

1. Open `/#/admin` (or `/admin`) and sign in.
2. In Publishing desk, create an artist profile and publish each real artwork. Supply an image URL, its actual SHA-256 asset digest, medium, dimensions, and USD price in cents. The stored digest is metadata, not an ownership certificate.
3. Image hosts must allow cross-origin texture loading for the WebGL gallery. Ordinary image detail views remain available when textures or WebGL cannot load.
4. Publish sports research with the real matchup, pick, confidence, and number of sources. These are operator-authored records. There is no live scores, odds, tracking, or sports provider integration in this release.
5. Enroll real node identities with their Ed25519 public keys. Private signing keys stay on the nodes. Revoke trust from the registry when necessary.

The public pages show database records and honest empty/error states. They no longer substitute illustrative art, simulated odds, invented motion readings, or sample node counts. The former `#/spaces` branch and finance simulation endpoints are outside the released application flow.

## Node heartbeats

An enrolled active node can POST `{ "mesh_region": "its-region" }` to `/api/beemax/heartbeat`. Sign the exact raw request using the existing protocol documented in `server/middleware.ts`: timestamp, nonce, method, path/search, and lowercase SHA-256 body digest, joined with newline characters. Include `X-Max-Node-Id`, `X-Max-Node-Signature`, `X-Max-Timestamp`, and `X-Max-Nonce`. Reused nonces are rejected. The command center displays persisted trust and heartbeat data; it does not invent network links or infer an active connection from trust status.

## Optional collector payments

Configure `RPC_URL`, `USDC_CONTRACT`, and `TREASURY_WALLET` on the Worker for Base mainnet only. Set each digital work's private HTTPS/IPFS collector asset URL when publishing. `PUBLIC_APP_URL` controls receipt links; `RESEND_API_KEY` enables email attempts, but a verified sender address must also replace the existing email sender before production email is usable.

A buyer must use the EOA wallet that paid and sign the site/artwork/transaction-bound access message. The Worker verifies the signature, chain, receipt, transfer recipient, amount, and confirmations before saving an atomic sale and unique receipt. A transaction hash alone is rejected. Signed retries can recover the access link for new receipts. Contract-wallet signatures and automatic wallet payment submission are not implemented. The client opens a protected collector vault after successful verification. Chain settlement and delivery require independent production verification; tests used synthetic receipts and no funds.

## Compatibility changes

- Artwork, sports, and chess record writes now require administrator authentication and same-origin requests. Public reads remain available.
- `/api/admin/login` establishes an HttpOnly, SameSite cookie. It no longer returns the bearer token to browser JavaScript. Existing integrations must adapt; authorized bearer tokens remain accepted by protected endpoints.
- Signing requires an independent JWT secret; the password hash is no longer used as a signing-secret fallback.
- Historical finance demo endpoints are no longer mounted on the root Worker. Their source/tests remain historical reference.
- The root Worker no longer declares placeholder `SESSION_KV` or unused AI bindings. The separate `workers/beemax-core` authentication flow and `portal-os` deployment retain their own configuration requirements.

## Local preview

Create an ignored `.dev.vars` with local administrator secrets, then run:

```bash
npm run db:migrate:local
npm run build
npm run preview:worker -- --ip 0.0.0.0
```

The preview serves built assets and local D1/KV storage at port 8787. After frontend edits, rebuild. `npm run dev` is available for Vite development; its API proxies target the same root Worker on port 8787.

## Outstanding release verification

- Provide and publish real inventory and sports research, or specify a licensed sports provider for integration.
- Verify production Cloudflare resources, secrets, migrations, and deployment.
- Verify WebGL rendering, orbit/zoom, and fullscreen on supported client devices. The shared task browser had WebGL disabled; keyboard/2D chess and image fallback were verified.
- Complete funded checkout and collector delivery verification only with explicit authorization. Production checkout was not exercised.
- Full dependency audit still reports six high development dependency entries via picomatch; the latest published version observed was 4.0.7 and was included in the advisory range. The production-only dependency audit passed with zero vulnerabilities. Do not apply audit's suggested downgrades to older tooling without checking their separate advisories.
