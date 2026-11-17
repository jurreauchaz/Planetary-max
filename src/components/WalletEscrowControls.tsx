import React, { useEffect, useState } from 'react';
import { approvalPacket, signEscrowApproval, submitEscrowRelease } from '../hooks/useWalletCheckout';

export default function WalletEscrowControls({ userId, orderId, setOrderId, busy, run }: {
  userId: string; orderId: string; setOrderId: (id: string) => void; busy: boolean;
  run: (work: () => Promise<string>) => Promise<void>;
}) {
  const [packet, setPacket] = useState('');
  useEffect(() => setPacket(''), [orderId]);
  function parsePacket() {
    try { return approvalPacket.parse(JSON.parse(packet)); }
    catch { throw new Error('Paste a valid approval packet containing orderId, deadline and signatures.'); }
  }
  return <details className="wallet-escrow"><summary>Escrow approvals</summary>
    <p>After verified payment, collect the Artist and a distinct Buyer or Admin approval. All parties must use the same packet within its four minute signing window.</p>
    <label>Order ID <input value={orderId} disabled={busy} onChange={e => { setOrderId(e.target.value); setPacket(''); }} /></label>
    <label>Shared approval packet <textarea rows={6} value={packet} disabled={busy} onChange={e => setPacket(e.target.value)} placeholder="Paste a co-signer’s packet, or leave blank to start one." /></label>
    <button disabled={busy || !userId.trim() || !orderId.trim()} onClick={() => void run(async () => {
      const next = await signEscrowApproval(userId.trim(), orderId.trim(), packet.trim() ? parsePacket() : undefined);
      setPacket(JSON.stringify(next, null, 2));
      return `Approval signed (${next.signatures.length}). Copy the packet for the other signer. Expires ${new Date(next.deadline * 1000).toLocaleTimeString()}.`;
    })}>Sign release approval</button>{' '}
    <button disabled={busy || !packet.trim()} onClick={() => void run(async () => {
      const parsed = parsePacket();
      if (parsed.orderId !== orderId.trim()) throw new Error('Packet and order ID must match.');
      const result = await submitEscrowRelease(parsed);
      setPacket('');
      return `Provenance issued: ${result.certificateId}. No wallet funds were transferred by this release.`;
    })}>Submit quorum</button>
    <p>Signing approves the displayed order terms; it does not pay for the order. Pending payment blocks release.</p>
  </details>;
}
