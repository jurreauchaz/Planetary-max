<!-- coderabbit-ai-generated:v1 -->

# MAX ecosystem update and specification coverage

This release extends the existing Portal. It preserves artwork inventory, legacy identities and roles, artwork orders, collector access, Base USDC settlement, and existing Durable Object classes and migrations. No production reset is included.

## Available in this update

- MAXART retains its immersive gallery, ordinary image fallback, search, detail view, and existing verified-artwork checkout.
- Games & Apps and MAX Media have persistent D1 catalogs with creator, description, cover, platform/format, version, DAT/USD/USDC price, official destination, and draft/published/archived lifecycle. The administrator can publish and edit releases. Only published records appear publicly. Catalog responses include at most the latest 200 releases.
- Digital distribution opens the publisher's official HTTPS release or purchase page. Paid access and fulfillment are handled by that linked store. No charge, DAT balance, escrow deposit, ownership certificate, or paid download entitlement is invented by the catalog. Real covers, releases and destination URLs must be supplied by the owner.
- BEEMAX is a conversational assistant in the administrator command center. It uses Cloudflare Workers AI model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, with server-owned system instructions and bounded conversation history. It has no tools for payments, shell execution, publishing, or autonomous infrastructure control. Conversation history is held in the open tab and clears when the component unmounts or the owner starts a new conversation. Prompts and recent public catalog context are sent to the configured model provider.
- The terminal retains its existing commands and adds `sys:status`, `ont:domains`, `agent:list`, `gov:policy`, and `catalog list`. All commands map to fixed read-only endpoints. They do not evaluate arbitrary code or claim autonomous multi-agent execution.
- MAX-SPACE Scenario lab compares bounded linear, exponential, double-exponential, and tetration functions with a base of 2–10 and height of 1–5. Values above safe integer precision are explicitly bounded. These are unitless mathematical scenarios, not measurements or promises of compute scaling.
- The EIP-712 SovereignIntent builder implements the supplied order/artwork/amount/nonce/timestamp schema on Ethereum chain 1, with domain `Portal-OS1 Sovereign Escrow`, version `1.0`, and address `0x5073657261536f7665726569676e436f72653031`. Signing and binding are tested locally; this is a reusable builder, not an enabled payment endpoint. It intentionally does not change Base chain 8453 artwork settlement.

## Specification requirements needing further inputs or infrastructure

| Requirement | Current boundary / next prerequisite |
| --- | --- |
| Exact Sovereign users schema and collector/artist/admin roles | Existing roles also include operator, auditor and node-agent; existing accounts and foreign keys are retained. A role mapping and account migration must precede a constraint rewrite. Existing public artist profiles are not new password logins. |
| DAT escrow held/released states and cryptographic certificates | Requires a defined DAT payment network/provider, amount units, signer policy, a verified deployed escrow contract, replay-safe nonce storage, expiry rules, and verified release events. Creating SQL tables or an EIP-712 signature alone does not establish deposited funds or ownership. |
| Multi-agent virtualization, daemon lifecycle, recovery | Existing registries remain; BEEMAX currently performs conversation only. Durable Objects can checkpoint application state but do not provide indefinitely running background daemons. |
| Zero-copy / zero-serialization across Workers | Local typed-array views can avoid local copies. Network boundaries require explicit encoding and do not guarantee zero-copy transport. No such cross-Worker guarantee is made. |
| P-STEP/1.0 ML-KEM-768 / ML-DSA-65 | Not implemented. Requires a versioned wire protocol, vetted implementation, identity and key lifecycle, interoperability vectors and threat-model review. Current edge transport uses Cloudflare HTTPS. |
| Oceanic, arctic, orbital, lunar compute | Physical infrastructure and trustworthy telemetry are not configured. Scenario lab is modeling only. |
| PMD-13 photonic asset routing | No photonic transport or device protocol was supplied. Digital catalog distribution uses HTTPS links. |
| Zero-cost operation | Cloudflare service availability, free allowances, and charges depend on the owner's account and usage. No universal zero-cost guarantee. |

## Deployment and validation boundary

Use the repository-root `wrangler.toml`. The nested `workers/beemax-core/wrangler.toml` targets the same Worker name and is not the showroom deployment configuration. Existing migration history must match the live namespace history; no registry reset or backend conversion is included here.

Apply D1 migration `0018_digital_catalog.sql` after the existing migration chain. Deploy the root Worker with `AI`, `BEEMAX_LIMITER`, and the existing `ADMIN_SESSIONS` bindings. Keep `ADMIN_PASSWORD` in Worker secrets. Workers AI must be available for the owner's account. A successful Wrangler dry run does not establish live inference or repair a historical namespace mismatch.

Local tests use synthetic records and a mock AI binding. The pinned CodeRabbit emulate v0.0.1 service catalog does not include Cloudflare Workers AI. Live model inference and deployed EIP-712 contract behavior remain unverified until account/contract access is supplied. No production resources are changed by the local checks.
