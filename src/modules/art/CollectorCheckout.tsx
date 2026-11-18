import React, { useEffect, useState } from 'react';
import { checkoutMessage, digitalCheckoutMessage } from '../../shared/checkoutMessage';
type WalletProvider = {request: (args: {method: string; params?: unknown[]}) => Promise<unknown>};
interface CheckoutConfig { enabled: boolean; treasury: string | null; contract: string | null }
export default function CollectorCheckout({ artworkId, productId, priceCents, recoveryOnly = false, recoverable = false }: { artworkId?: string; productId?: string; priceCents?: number; recoveryOnly?: boolean; recoverable?: boolean }) {
  const [config, setConfig] = useState<CheckoutConfig | null>(null); const [hash, setHash] = useState(''); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(''); const [unlock, setUnlock] = useState('');
  useEffect(() => { const controller = new AbortController(); fetch('/api/checkout/config', { signal: controller.signal }).then(async r => { if (r.ok) setConfig(await r.json() as CheckoutConfig); }).catch(() => {}); return () => controller.abort(); }, []);
  const recovery = recoveryOnly || (recoverable && !config?.enabled);
  if (!config?.enabled && !recovery) return <p className="quiet">Online acquisition is currently unavailable.</p>;
  return <section className="collector-checkout"><h3>{recovery ? 'Recover purchase or payment status' : 'Collector access'}</h3>{!recovery && <><p>Direct Base USDC acquisition{priceCents ? ` · ${(priceCents / 100).toFixed(2)} USDC` : ''}. Verify a transfer from your wallet to access the collector asset.</p><p className="quiet">Inventory is not reserved before payment. Confirm availability with the publisher before sending funds. This is direct settlement without escrow.</p><details><summary>Payment destination</summary><p className="proof-hash">Base (chain 8453)<br/>Treasury: {config?.treasury}<br/>USDC contract: {config?.contract}</p></details></>}<form onSubmit={async e => { e.preventDefault(); setBusy(true); setNotice(''); try { const wallet=(window as unknown as {ethereum?:WalletProvider}).ethereum; if(!wallet)throw new Error('Open this page in a browser with an Ethereum wallet.'); const accounts=await wallet.request({method:'eth_requestAccounts'}) as string[];const buyerAddress=accounts[0];if(!buyerAddress)throw new Error('Select the wallet that sent your payment.');const chain=await wallet.request({method:'eth_chainId'});if(chain!=='0x2105')throw new Error('Switch your wallet to Base mainnet.');const message=productId ? digitalCheckoutMessage(window.location.origin,productId,hash,buyerAddress) : checkoutMessage(window.location.origin,artworkId!,hash,buyerAddress);const hex='0x'+Array.from(new TextEncoder().encode(message),byte=>byte.toString(16).padStart(2,'0')).join('');const signature=await wallet.request({method:'personal_sign',params:[hex,buyerAddress]});const res = await fetch(productId ? '/api/catalog/verify-usdc' : '/api/checkout/verify-usdc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productId ? { productId, txHash: hash, buyerAddress, signature } : { artworkId, txHash: hash, buyerAddress, signature, buyerEmail: email || undefined }) }); const data = await res.json() as { error?: string; message?: string; unlockUrl?: string }; if (!res.ok) throw new Error(data.error || 'Verification failed.'); if (data.unlockUrl) { setUnlock(data.unlockUrl); setNotice('Payment verified. Save your collector access link.'); } else setNotice(data.message || 'Waiting for transaction confirmation.'); } catch (e) { setNotice(e instanceof Error ? e.message : 'Verification failed.'); } finally { setBusy(false); } }}><label>Transaction hash<input required pattern="0x[a-fA-F0-9]{64}" value={hash} onChange={e => setHash(e.target.value)}/></label>{!productId && <label>Receipt email (optional)<input type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label>}<button className="neon-button" disabled={busy || Boolean(unlock)}>{busy ? 'Verifying…' : 'Connect wallet & verify payment'}</button></form><p role="status">{notice}</p>{unlock && <a className="neon-button" href={unlock}>Open collector vault ↗</a>}</section>;
}
export function CollectorVault() {
  const [asset, setAsset] = useState<{ title: string; gateway_url: string; ipfs_sha256?: string; certificate_hash?: string; edition_number?: number; total_editions?: number; tx_reference?: string } | null>(null); const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const id = window.location.pathname.split('/')[2];
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!id || !token) { setError('Open the collector access link issued after payment verification.'); return; }
    const endpoint = params.get('kind') === 'digital'
      ? `/api/catalog/orders/${encodeURIComponent(id)}/unlock`
      : `/api/artworks/${encodeURIComponent(id)}/unlock`;
    fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => {
        const data = await response.json() as { title: string; gateway_url: string; error?: string };
        if (!response.ok) throw new Error(data.error || 'Collector access failed.');
        if (!/^https:\/\//.test(data.gateway_url)) throw new Error('Collector asset address is unavailable.');
        setAsset(data);
      })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Collector access failed.'); });
    return () => controller.abort();
  }, []);
  return <main className="admin-access"><a href="/#/art">← Return to collection</a><h1>Collector vault</h1>{error ? <p role="alert">{error}</p> : asset ? <><h2>{asset.title}</h2><a className="neon-button" href={asset.gateway_url} rel="noreferrer">Open collector asset ↗</a>{asset.certificate_hash && <><p>Edition {asset.edition_number} / {asset.total_editions}</p><p className="proof-hash">Settlement record SHA-256: {asset.certificate_hash}</p><p className="quiet">This digest records this acquisition. It is not a blockchain token or proof of copyright.</p></>}{asset.ipfs_sha256 && <p className="proof-hash">Asset SHA-256: {asset.ipfs_sha256}</p>}</> : <p role="status">Validating access…</p>}</main>;
}
