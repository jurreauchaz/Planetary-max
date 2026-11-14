import React, { useState } from 'react';

type TreasuryWithdrawalModalProps = {
  availableBalance: number;
  nodeDestination?: string;
  /** Supply headers from the registered node-signing client; unsigned requests are rejected. */
  getSignedHeaders?: (method: string, url: string, body: string) => Promise<Record<string, string>>;
};

type WithdrawalResponse = {
  success?: boolean;
  simulation?: boolean;
  message?: string;
  request_id?: string;
  error?: string;
};

export function TreasuryWithdrawalModal({
  availableBalance,
  nodeDestination = 'node_admin_sovereign_01',
  getSignedHeaders,
}: TreasuryWithdrawalModalProps) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!Number.isFinite(availableBalance) || availableBalance <= 0) {
      setError('There is no positive demo balance to submit.');
      return;
    }
    if (!getSignedHeaders) {
      setError('Treasury demo requests require a registered node-signing client. No request was sent.');
      return;
    }

    setWithdrawing(true);
    setNotice(null);
    setError(null);
    const url = '/api/v1/treasury/withdraw';
    const body = JSON.stringify({ nodeDestination, voucherAmount: availableBalance });

    try {
      const signedHeaders = await getSignedHeaders('POST', url, body);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...signedHeaders },
        body,
      });
      const data = await response.json() as WithdrawalResponse;
      if (!response.ok || !data.success) throw new Error(data.error || `Request failed (${response.status}).`);
      setNotice(`${data.message || 'Demo request recorded.'}${data.request_id ? ` Request ID: ${data.request_id}` : ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit treasury demo request.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-lg p-6 mt-6 text-slate-100 shadow-xl" aria-labelledby="treasury-heading">
      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
        <div>
          <h3 id="treasury-heading" className="text-base font-bold">Sovereign Treasury Demo</h3>
          <p className="text-xs text-slate-400">Submit a signed demo request. This prototype does not redeem vouchers or move funds.</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block font-mono">Available (display only)</span>
          <span className="text-amber-400 font-bold font-mono text-lg">{Number.isFinite(availableBalance) ? availableBalance : 0} ZK</span>
        </div>
      </div>

      {notice && <p role="status" className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500 rounded text-emerald-300 text-xs">{notice}</p>}
      {error && <p role="alert" className="mb-4 p-3 bg-red-950/50 border border-red-500 rounded text-red-300 text-xs">{error}</p>}

      <button
        type="button"
        onClick={handleWithdraw}
        disabled={withdrawing || !Number.isFinite(availableBalance) || availableBalance <= 0}
        className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded text-sm transition-colors shadow-lg"
      >
        {withdrawing ? 'Submitting demo request…' : `Submit ${availableBalance} ZK demo request`}
      </button>
    </section>
  );
}
