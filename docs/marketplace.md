<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:0930f61137df47627a2cc2b99de04028ebe381b4cfedb367b9ea99bf7bf13dbe -->

# Marketplace settlement API

Requires migration 0021 and Node 24 for tests. Existing records retain their statuses; new orders progress from pending to completed upon verified HMAC settlement. Escrow release is recorded separately in escrow_released_at.

## Registered identities and signing

server/eip712.ts exports the supplied EIP712_DOMAIN (Planetary-max Sovereign, version 1, chain 1, zero verifying contract), EIP712_TYPES.RegisterKey, ORDER_TYPES and RELEASE_TYPES. These are off-chain approvals; the zero address is not a deployed escrow contract.

Signing identities come from active users.public_key records. Supported values are Ethereum addresses and compressed/uncompressed secp256k1 public keys. Provision these through trusted database administration after verifying account ownership. RegisterKey types alone do not establish account ownership; no public key enrollment endpoint has been added. Private wallet keys remain with the signers.

## Create an order

POST /api/orders/create (alias /api/marketplace/orders) accepts userId, artworkId, editionId, nonce, deadline and signature. IDs are strings. The nonce is 16–128 letters, digits, underscores or hyphens. The deadline is Unix seconds within the next five minutes. Use a fresh nonce for every request.

Sign ORDER_TYPES with those fields except signature, plus amountCents and currency from the artwork listing and audience equal to the request URL origin (scheme, host and port). D1 supplies the authoritative amount and currency; request overrides are rejected. Success is HTTP 201 with a text orderId, amount_cents, currency and payment_status: pending. The order and edition reservation are written atomically.

This API requires a wallet signing client. The existing unsigned reservation component does not implement this protocol.

## Confirm payment

POST /api/payments/webhook accepts this provider event:

```json
{"orderId":"order_uuid","paymentId":"unique-provider-payment-id","amountCents":1800,"currency":"DAT","status":"completed"}
```

The trusted provider signs timestamp + "." + exactRawBody using HMAC-SHA-256 and the PAYMENT_WEBHOOK_SECRET. X-Payment-Timestamp contains current Unix seconds; X-Payment-Signature contains the hex signature. Events outside five minutes are rejected. The provider must implement this contract after verifying actual capture; no external payment provider has been configured automatically.

Only the persisted amount and currency can settle an order. Identical retries are idempotent. A payment reference cannot settle another order. Receipt insertion and status completion are atomic. Payment completion alone does not issue provenance.

The existing Base /api/checkout/verify-usdc flow remains separate and does not mark marketplace orders completed. It rejects artworks with active marketplace orders to prevent conflicting fulfillment. Signatures using the supplied chain-1 domain do not prove a Base payment.

## Release escrow

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:89edba8d1a53171966d42017efc104c5c87c1bfff0618a04110f494622814c35 -->

POST /api/escrow/release accepts orderId, deadline and two to ten signatures: [{userId, signature}, ...]. Every party signs RELEASE_TYPES with orderId, artworkId, editionId, buyerId, amountCents and currency from the stored order, deadline and request-origin audience.

Require the artwork artist plus a distinct buyer or registered admin. Every additional signer must also be the buyer or a registered admin. All users must be active and have distinct IDs and wallet addresses. Every supplied signature and signing authority is checked, including again at commit. No caller-supplied role or public key is trusted. Expired orders cannot release; completed payment requires a matching settlement receipt. A missing order returns HTTP 404.

<!-- /coderabbit-ai-generated:v1 -->

The D1 batch rechecks signing authority and order terms, marks the edition sold, issues an HMAC-SHA-256 provenance certificate, records signature hashes and appends a release audit event. Failures roll back the complete batch. Payment status stays completed; escrow_release_id prevents duplicate release. No payout or blockchain transaction is initiated.

## Production

Configure distinct PAYMENT_WEBHOOK_SECRET and PROVENANCE_SECRET values of at least 32 characters through Cloudflare's encrypted store:

```sh
npx wrangler secret put PAYMENT_WEBHOOK_SECRET
npx wrangler secret put PROVENANCE_SECRET
npm run db:migrate
npm run deploy
```

Keep PROVENANCE_SECRET available for verification of issued certificates. Existing databases use migrations, not a schema.sql import. The supplied domain does not configure live hostname routing; the intended hostname and authenticated Cloudflare access are still required. SPA fallback remains configured in wrangler.toml.


## Browser wallet checkout and approval packets

The storefront now uses signed marketplace orders instead of the legacy email-only checkout intent. Legacy endpoints remain available for their existing callers. Enter the trusted, pre-provisioned user ID, then choose an available artwork. POST /api/orders/prepare reads the active registered key and selects the first available edition at its database price. It returns the signing wallet and canonical CreateOrder value with a fresh UUID nonce, four minute deadline and request-origin audience; this preview makes no reservation. The browser signs those terms and posts to /api/orders/create. Reservation races and key/price changes are checked again by that write route.

src/hooks/useWalletCheckout.ts uses ethers BrowserProvider with an injected EIP1193 wallet, checks the connected address against the registered wallet, and requires the shared domain's Ethereum mainnet chain ID. All signing fields use server/eip712.ts. This signs a reservation; no transaction or payment transfer is requested. WalletConnect session creation requires separate project configuration and is not installed; the functions also accept an already-connected EIP1193 provider.

After an authenticated settlement webhook marks payment completed, enter the order ID under Escrow approvals. POST /api/escrow/prepare returns the canonical ReleaseEscrow value only for an active registered Artist, Buyer or Admin on an eligible order. The first signer starts a packet; subsequent signers paste that packet and sign with its same deadline. Copy the JSON between signers and submit the collected quorum before expiry. Clear the packet to start a new signing window; every signer must sign again. Packets are held in component memory, and signatures are bearer approvals for their signed terms until expiry. No private keys leave the wallet.

The previews do not authenticate a session or grant authority: the write endpoints still recover every signature and recheck the database keys, quorum, payment receipt, reservation and order state. A release mints provenance and records escrow state, with funds_transferred false; it is not a financial payout.


<!-- /coderabbit-ai-generated:v1 -->