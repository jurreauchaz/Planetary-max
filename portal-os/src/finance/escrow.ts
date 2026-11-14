export interface EscrowTerms { transactionId: string; amountUsd: number; expiresAt: number }

/** Describes escrow terms only; no wagering, custody, or settlement is performed. */
export function validateEscrowTerms(terms: EscrowTerms): EscrowTerms {
  if (!/^[\w.:-]{1,128}$/.test(terms.transactionId) || !Number.isFinite(terms.amountUsd) || terms.amountUsd <= 0 ||
      !Number.isSafeInteger(terms.expiresAt) || terms.expiresAt <= Date.now()) throw new Error('Invalid escrow terms');
  return Object.freeze({ ...terms });
}
