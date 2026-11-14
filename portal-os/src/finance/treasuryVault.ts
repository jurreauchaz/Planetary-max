export interface TreasuryPolicy { requiredApprovals: number; reserveFloorUsd: number }

/** Policy validation only; this scaffold does not control keys or execute transfers. */
export function validateTreasuryPolicy(policy: TreasuryPolicy): TreasuryPolicy {
  if (!Number.isInteger(policy.requiredApprovals) || policy.requiredApprovals < 2 || policy.requiredApprovals > 5 ||
      !Number.isFinite(policy.reserveFloorUsd) || policy.reserveFloorUsd < 0) throw new Error('Invalid treasury policy');
  return Object.freeze({ ...policy });
}
