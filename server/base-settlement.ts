/** Shared receipt validation for existing artwork checkout and direct digital sales. */
export type SettlementConfig = { RPC_URL?: string; USDC_CONTRACT?: string; TREASURY_WALLET?: string };
export function settlementConfigured(env: SettlementConfig): env is Required<SettlementConfig> {
  return Boolean(env.RPC_URL && /^0x[\da-fA-F]{40}$/.test(env.USDC_CONTRACT || '') && /^0x[\da-fA-F]{40}$/.test(env.TREASURY_WALLET || ''));
}
export async function verifyBaseTransfer({ RPC_URL, USDC_CONTRACT, TREASURY_WALLET }: Required<SettlementConfig>, txHash: string, buyerAddress: string, priceCents: number, minimumUnits?: string): Promise<{ sender: string; amountUnits: string } | { status: 202 | 403 | 503; body: { status?: string; message?: string; error?: string } }> {
const BASE_CHAIN_ID = 8453n;
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const rpc = async (method: string, params: unknown[]) => {
      const response = await fetch(RPC_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (!response.ok) throw new Error(`Base RPC returned HTTP ${response.status}`);
      const data = await response.json() as { result?: unknown; error?: { message?: string } };
      if (data.error) throw new Error(data.error.message || 'Base RPC request failed');
      return data.result;
    };
    const chainId = await rpc('eth_chainId', []) as string;
    if (BigInt(chainId) !== BASE_CHAIN_ID) {
      console.error('Configured USDC RPC is not connected to Base mainnet');
      return { status: 503, body: { error: 'Configured RPC is not connected to Base Mainnet' } };
    }
    const receipt = await rpc('eth_getTransactionReceipt', [txHash]) as null | {
      status: string; from: string; blockNumber: string;
      logs: Array<{ address: string; topics: string[]; data: string }>;
    };
    if (!receipt) return { status: 202, body: { status: 'pending', message: 'Transaction not yet mined' } };
    if (receipt.status !== '0x1') return { status: 403, body: { error: 'On-chain transaction reverted or failed' } };
    const latestBlock = BigInt(await rpc('eth_blockNumber', []) as string);
    if (latestBlock - BigInt(receipt.blockNumber) < 2n) return { status: 202, body: { status: 'pending', message: 'Waiting for Base confirmations' } };

    const expectedRecipient = `0x${TREASURY_WALLET.slice(2).toLowerCase().padStart(64, '0')}`;
    const expectedAmount = minimumUnits === undefined ? BigInt(priceCents) * 10_000n : BigInt(minimumUnits); // USDC has 6 decimals; price_cents is USD cents.
    let verifiedSender: string | undefined;
    let amountUnits = '';
    for (const log of receipt.logs ?? []) {
      if (log.address.toLowerCase() !== USDC_CONTRACT.toLowerCase() || log.topics.length < 3 || log.topics[0].toLowerCase() !== TRANSFER_EVENT_TOPIC) continue;
      if (log.topics[2].toLowerCase() !== expectedRecipient.toLowerCase() || !/^0x[\da-fA-F]+$/.test(log.data)) continue;
      let amount: bigint;
      try { amount = BigInt(log.data); } catch { continue; }
      if (amount <= 0n || amount < expectedAmount) continue;
      const sender = `0x${log.topics[1].slice(-40)}`;
      if (buyerAddress && sender.toLowerCase() !== buyerAddress.toLowerCase()) continue;
      verifiedSender = sender; amountUnits = amount.toString();
      break;
    }
    if (!verifiedSender) return { status: 403, body: { error: 'No matching USDC transfer from the buyer to the treasury for the required amount' } };

return { sender: verifiedSender, amountUnits };
}
