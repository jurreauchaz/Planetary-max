import React, { useCallback, useEffect, useState } from 'react';
type Sale = { id: string; title: string; amount_cents: number; currency: string; edition_number: number; total_editions: number; buyer_wallet: string; tx_reference: string; certificate_hash: string; created_at: string };
export default function DigitalSales() {
  const [orders, setOrders] = useState<Sale[]>([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/digital-orders');
      const data = await response.json() as { orders: Sale[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Sales history is unavailable.');
      setOrders(data.orders);
    } catch (e) { setError(e instanceof Error ? e.message : 'Sales history is unavailable.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return <section><h4>Direct digital acquisitions</h4><button type="button" onClick={() => void reload()} disabled={loading}>Refresh acquisitions</button>{loading ? <p role="status">Loading acquisitions…</p> : error ? <p role="alert">{error}</p> : !orders.length ? <p>No verified digital acquisitions yet.</p> : <ul className="digital-sales">{orders.map(order => <li key={order.id}><strong>{order.title}</strong><p>{(order.amount_cents / 100).toFixed(2)} {order.currency} · Edition {order.edition_number} / {order.total_editions} · {new Date(order.created_at).toLocaleString()}</p><p className="proof-hash">Buyer: {order.buyer_wallet}<br/>Base receipt: {order.tx_reference}<br/>Settlement SHA-256: {order.certificate_hash}</p></li>)}</ul>}</section>;
}
