import type { D1Database } from '@cloudflare/workers-types';

export interface WaterfallInput {
  txId: string;
  sourceDomain: 'MAX_ART' | 'MAX_CHESS' | 'MAX_SPORT' | 'MAX_TELECOM' | 'API_GATEWAY';
  grossAmountUsd: number;
  personalSweepBps: number;
  onchainTxHash?: string;
}

export class WaterfallValidationError extends Error {}

export async function executeSovereignWaterfall(db: D1Database, input: WaterfallInput) {
  if (!/^[\w.:-]{1,128}$/.test(input.txId)) throw new WaterfallValidationError('txId is invalid');
  if (!Number.isFinite(input.grossAmountUsd) || input.grossAmountUsd < 0 || input.grossAmountUsd > 1_000_000_000) {
    throw new WaterfallValidationError('grossAmountUsd must be a finite amount between 0 and 1,000,000,000');
  }
  if (!Number.isInteger(input.personalSweepBps) || input.personalSweepBps < 0 || input.personalSweepBps > 4500) {
    throw new WaterfallValidationError('personalSweepBps must be an integer between 0 and 4500');
  }
  if (input.onchainTxHash !== undefined && (input.onchainTxHash.length < 1 || input.onchainTxHash.length > 256)) {
    throw new WaterfallValidationError('onchainTxHash must be 1–256 characters');
  }

  const cents = Math.round(input.grossAmountUsd * 100);
  const privateCents = Math.round(cents * input.personalSweepBps / 10_000);
  const taxCents = Math.round(cents * 0.25);
  const opsCents = Math.round(cents * 0.30);
  const endowmentCents = cents - privateCents - taxCents - opsCents;
  const dollars = (value: number) => value / 100;
  const allocations = {
    privateSweepUsd: dollars(privateCents),
    taxEscrowUsd: dollars(taxCents),
    opsBufferUsd: dollars(opsCents),
    endowmentUsd: dollars(endowmentCents),
  };

  await db.prepare(
    `INSERT INTO treasury_waterfall_ledger
      (tx_id, source_domain, gross_amount_usd, private_sweep_usd, tax_escrow_usd, ops_buffer_usd, endowment_usd, legal_class, onchain_tx_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    input.txId, input.sourceDomain, dollars(cents), allocations.privateSweepUsd,
    allocations.taxEscrowUsd, allocations.opsBufferUsd, allocations.endowmentUsd,
    'IP_ROYALTY_LICENSE_001', input.onchainTxHash ?? null,
  ).run();

  return { txId: input.txId, allocations, legalClassification: 'IP_ROYALTY_LICENSE_001' as const };
}
