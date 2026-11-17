import React, { lazy, Suspense, useMemo, useState } from 'react';
import { useArtworks } from '../../hooks/useArtworks';
import { executeWalletCheckout } from '../../hooks/useWalletCheckout';
import WalletEscrowControls from '../../components/WalletEscrowControls';

const ImmersiveGallery = lazy(() => import('../../components/PortalImmersiveEngine').then(module => ({ default: module.PortalImmersiveEngine })));

export default function ArtGalleryView() {
  const { artworks, loading, error } = useArtworks();
  const [immersive, setImmersive] = useState(false);
  const galleryArtworks = useMemo(() => artworks.map(art => ({ id: art.id, title: art.title, imageUrl: art.image_url })), [artworks]);
  const [userId, setUserId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  async function run(work: () => Promise<string>) {
    setPending('wallet'); setMessage('Waiting for your wallet or the service…');
    try { setMessage(await work()); }
    catch (cause) {
      const rejected = cause && typeof cause === 'object' && 'code' in cause && cause.code === 'ACTION_REJECTED';
      setMessage(rejected ? 'Wallet request declined. No new approval was submitted.' : cause instanceof Error ? cause.message : 'Wallet request failed.');
    }
    finally { setPending(null); }
  }
  async function checkout(itemId: string) {
    await run(async () => {
      const data = await executeWalletCheckout(userId.trim(), itemId);
      setOrderId(data.orderId);
      return `Order ${data.orderId} reserved: ${(data.amount_cents / 100).toFixed(2)} ${data.currency}. Payment pending. Signing does not transfer funds; verified settlement is required before release.`;
    });
  }
  return <section className="module-view">
    <div className="module-heading"><div><span className="eyebrow">01 / MAX-ART</span><h1>Sovereign <em>collection.</em></h1><p>Artwork inventory from the sovereign catalog.</p></div></div>
    <button type="button" aria-pressed={immersive} onClick={() => setImmersive(value => !value)}>{immersive ? 'Close immersive gallery' : 'Explore immersive gallery'}</button>
    {immersive && !loading && !error && artworks.length > 0 && <Suspense fallback={<p role="status">Opening gallery…</p>}><ImmersiveGallery mode="art-gallery" artworks={galleryArtworks} /></Suspense>}
    <div className="wallet-checkout">
      <label>Registered user ID <input value={userId} disabled={pending !== null} onChange={e => setUserId(e.target.value)} autoComplete="off" /></label>
      <p>Connect the Ethereum mainnet wallet registered to this account. Wallet checkout signs a pending reservation; it does not collect payment.</p>
      <WalletEscrowControls userId={userId} orderId={orderId} setOrderId={setOrderId} busy={pending !== null} run={run} />
    </div>
    {message && <p role="status">{message}</p>}
    {loading ? <p role="status">Loading collection…</p> : error ? <p role="alert">{error}</p> : !artworks.length ? <p>No artworks available.</p> :
      <div className="art-grid">{artworks.map(art => <article className="art-card" key={art.id}>
        <img src={art.image_url} alt={art.title} loading="lazy" style={{ width: '100%', height: 260, objectFit: 'cover' }} />
        <div className="art-card-caption"><div><h2>{art.title}</h2><p>{art.artist_name} · {art.medium}</p><p>{(art.price_cents / 100).toFixed(2)} {art.currency} · {art.status}</p>
          <button disabled={pending !== null || art.status !== 'available' || !userId.trim()} onClick={() => void checkout(art.id)}>{pending !== null ? 'Processing…' : 'Sign wallet checkout'}</button>
        </div></div>
      </article>)}</div>}
  </section>;
}
