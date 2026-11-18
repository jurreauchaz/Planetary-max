<!-- coderabbit-ai-generated:v1 -->

# MAX ecosystem update and specification coverage

This release extends the existing Portal. It preserves artwork inventory, legacy identities and roles, artwork orders, collector access, Base USDC settlement, and existing Durable Object classes and migrations. No production reset is included.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:d32586c3caac5f514604f649b6f5e52d2fd5a24516e9b7ca49d65847d2af8052 -->

## Available in this update

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:654bc4276b9a3cea442dd233ff4d7205e48e309d7e52b582b94bfc2a81c69dbc -->

- The command-center overview is public. Optional Operator sign-in opens protected publishing, customer data, node operations and model inference. <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:85285bc2482f8b4c5d82df244a24254247dbe5554d567a1c5ce737c285d80868 -->

Operator authentication preserves existing secret precedence and verifies the session cookie; no default password is embedded. Public sign-in omits deployment and secret-configuration guidance.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->
- Games/apps and media have featured trailer showrooms, screenshot filmstrips, release navigation and immersive image galleries. Optional previews use direct HTTPS video files and up to 12 screenshots. Browser playback depends on the host and supported media encoding. No sample catalog is published.
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:762cfa383e6e5fb260382483ed72aff7650f525d31ff172ab89a7e85e202ad3c -->

- MAXART retains its immersive gallery, image fallback, search, detail view and native verified-artwork checkout.
- Games & Apps and MAX Media have persistent D1 catalogs with draft/published/archived lifecycle, metadata hashes and finite digital edition supply. Only published records appear publicly (at most 200). Authenticated operators can publish, edit, archive and inspect recent acquisitions.
- Paid releases use native Base USDC transfer verification and EOA wallet proof; private delivery and legacy paid destination URLs are excluded from public catalog responses. A receipt is globally redeemable once across artwork and digital catalogs. Digital orders snapshot the asset and issue a SHA-256 settlement record bound to the paying wallet, receipt, amount and edition. Signed retries recover access. Free releases retain their launch link. Real inventory, an RPC, treasury and token configuration are required. DAT settlement is not configured.
- This direct flow verifies payments already sent; it has no prepayment reservation, escrow, automatic refund or wallet payment submission. Confirm availability with the publisher before sending funds. Existing paid digital publications require private asset/digest fields to become eligible for acquisition. Their external destinations are preserved privately and no longer act as purchase CTAs. Edition supply becomes fixed after the first digital acquisition.
- Application-level D1 triggers record artwork and digital publication/inventory changes and payment confirmations, and reject changes/deletion of ledger events, digital orders and receipt claims. This does not guarantee immutability against schema changes by database administrators or backfill historical events.

<!-- /coderabbit-ai-generated:v1 -->
- BEEMAX is a conversational assistant in the administrator command center. It uses Cloudflare Workers AI model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, with server-owned system instructions and bounded conversation history. It has no tools for payments, shell execution, publishing, or autonomous infrastructure control. Conversation history is held in the open tab and clears when the component unmounts or the owner starts a new conversation. Prompts and recent public catalog context are sent to the configured model provider.
- The terminal retains its existing commands and adds `sys:status`, `ont:domains`, `agent:list`, `gov:policy`, and `catalog list`. All commands map to fixed read-only endpoints. They do not evaluate arbitrary code or claim autonomous multi-agent execution.
- MAX-SPACE Scenario lab compares bounded linear, exponential, double-exponential, and tetration functions with a base of 2–10 and height of 1–5. Values above safe integer precision are explicitly bounded. These are unitless mathematical scenarios, not measurements or promises of compute scaling.
- The EIP-712 SovereignIntent builder implements the supplied order/artwork/amount/nonce/timestamp schema on Ethereum chain 1, with domain `Portal-OS1 Sovereign Escrow`, version `1.0`, and address `0x5073657261536f7665726569676e436f72653031`. Signing and binding are tested locally; this is a reusable builder, not an enabled payment endpoint. It intentionally does not change Base chain 8453 artwork settlement.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:5fd3cf69a2238c0a7e3bdd0fd2bad9944aadf3b148d1d94ba0ad88c298da8aa7 -->

## Review hardening

Paid asset hashes are excluded from the public digital catalog because a raw public IPFS digest can identify the downloadable content. Operators must declare actual encrypted or access-controlled delivery; IPFS requires encryption. Hidden links alone do not protect paid files. Encryption keys need a secure delivery arrangement with collectors. This app does not provision or verify a remote host’s access controls.

Verified digital payments that cannot acquire an edition are persisted as refund review cases. Publishers return funds manually from the treasury and submit the refund transaction; the server verifies the full recorded amount, token, sender and original buyer before resolving the case. The original receipt remains globally claimed. Buyers check progress with their original signed receipt. Orders recover independently of new-checkout availability. Competing edition purchases retry with fresh edition certificates while guarding the original offer. Successful writes are confirmed by inserted IDs rather than trigger-sensitive D1 change counts.

## Specification requirements needing further inputs or infrastructure

<!-- /coderabbit-ai-generated:v1 -->

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

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:c9f272e76881642c1810d3603a881bc77c5ece14c518f21037a112f4471fbca5 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:030fca5b93b3d646b79004061654367ab167990ce86e54c5e1d753f09f08b5dc -->

Apply D1 migrations `0018_digital_catalog.sql`, `0019_storefront_previews.sql` and <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:23da2482db4d3985119ae6f3f1ac7523ad105e05f591fdde7e9462803e54cb47 -->

`0020_direct_digital_commerce.sql` and `0021_payment_recovery.sql` after

<!-- /coderabbit-ai-generated:v1 --> the existing migration chain.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 --> Deploy the root Worker with `AI`, `BEEMAX_LIMITER`, and the existing `ADMIN_SESSIONS` bindings. Keep `ADMIN_PASSWORD` in Worker secrets. Workers AI must be available for the owner's account. A successful Wrangler dry run does not establish live inference or repair a historical namespace mismatch.

Local tests use synthetic records and a mock AI binding. The pinned CodeRabbit emulate v0.0.1 service catalog does not include Cloudflare Workers AI. Live model inference and deployed EIP-712 contract behavior remain unverified until account/contract access is supplied. No production resources are changed by the local checks.
