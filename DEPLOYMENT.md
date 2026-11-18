<!-- coderabbit-ai-generated:v1 -->

# Application deployment

The client is a React/Vite application served by the root Cloudflare Worker (`src/worker.ts`). Deploy the Worker and its built `dist` assets together. A static host alone cannot run the database, registry, or collector APIs.

## Requirements

- Node 24 or newer and npm. Use the committed `package-lock.json` with `npm ci`.
- Cloudflare access to the D1 database and KV namespace configured in `wrangler.toml`. Their supplied IDs are configured; a local dry run does not verify account ownership or resource existence.
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:f4e36bbe8b328e7de629334110952b4bb5a6a2d0230b4c5a6232ef3604983015 -->

- For Dashboard-based administrator access, configure the `ADMIN_PASSWORD` Worker secret with a strong, unique password. The Worker uses random server-side sessions in its `ADMIN_SESSIONS` Durable Object binding. Sessions expire after four hours and are revoked on logout. The root Worker includes a native login rate limiter of 10 attempts per minute per reported client IP. Existing `ADMIN_PASSWORD_HASH` and independent `JWT_SECRET` credentials are supported when `ADMIN_PASSWORD` is absent.

<!-- /coderabbit-ai-generated:v1 -->

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

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:2217684bf27a34a436e1f5744d4f38c62f262447de6ba97b9ea4928be53b81a1 -->

### Create the administrator login

1. Publish and deploy the current Worker code, including the `v3-admin-sessions` Durable Object migration in `wrangler.toml`.
2. In Cloudflare Dashboard, open **Workers & Pages**, select the `planetary-max` Worker, and add a secret named `ADMIN_PASSWORD` under **Settings → Variables and Secrets**. Choose a unique, long password and save it in a password manager. Deploy the updated configuration if prompted.
3. Open `/#/admin` on the deployed Worker domain and enter that password. There is no username. Never share the password in chat or commit it to the repository.

The Dashboard password takes precedence if both `ADMIN_PASSWORD` and legacy secrets exist. Switching to Dashboard mode invalidates legacy JWT sessions and rejects the old password. Changing the Dashboard password invalidates current sessions. The Dashboard mode uses independent random opaque tokens stored in Durable Objects; it does not derive signing keys from the password.

For an existing hash-based installation, leave `ADMIN_PASSWORD` unset and retain `ADMIN_PASSWORD_HASH` and an independent `JWT_SECRET` of at least 32 bytes. The existing `npm run admin:setup -- --remote` command provisions these legacy secrets through an authenticated Wrangler session. It rotates the JWT secret and invalidates existing legacy sessions. For a local Preview, `npm run admin:setup -- --local` creates an ignored `.dev.vars` without overwriting an existing file. Keep local and production passwords different.

<!-- /coderabbit-ai-generated:v1 -->

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
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:8bb1b85f6ec64aa0882291653a4299986556d6c7d79d68321ffd0202634b29ca -->

- Legacy JWT mode requires an independent signing secret and never uses the password hash as a signing-secret fallback. Dashboard password mode uses independent opaque server-side sessions instead of JWTs.

<!-- /coderabbit-ai-generated:v1 -->
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
