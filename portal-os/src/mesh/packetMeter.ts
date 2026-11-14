export interface UsageVoucher { nodeId: string; bytes: number; occurredAt: number }

/** Aggregate validated usage counters in memory; durable settlement is intentionally external. */
export class PacketMeter {
  private readonly totals = new Map<string, number>();
  record(voucher: UsageVoucher): number {
    if (!/^[\w.-]{1,128}$/.test(voucher.nodeId) || !Number.isSafeInteger(voucher.bytes) || voucher.bytes < 0) {
      throw new Error('Invalid usage voucher');
    }
    const total = (this.totals.get(voucher.nodeId) ?? 0) + voucher.bytes;
    if (!Number.isSafeInteger(total)) throw new Error('Usage total overflow');
    this.totals.set(voucher.nodeId, total);
    return total;
  }
}
