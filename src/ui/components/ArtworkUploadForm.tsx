import React, { useState } from 'react';

interface ArtworkUploadFormProps {
  onSuccess?: () => void;
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  artwork?: { id: string };
}

export function ArtworkUploadForm({ onSuccess }: ArtworkUploadFormProps) {
  const [creator, setCreator] = useState('');
  const [title, setTitle] = useState('');
  const [medium, setMedium] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [priceCents, setPriceCents] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [provenanceHash, setProvenanceHash] = useState('');
  const [status, setStatus] = useState<{ loading: boolean; error?: string; success?: string }>({ loading: false });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ loading: true });

    try {
      const response = await fetch('/api/artworks', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator: creator.trim(),
          title: title.trim(),
          medium: medium.trim(),
          dimensions: dimensions.trim(),
          price_cents: Number(priceCents),
          image_url: imageUrl.trim(),
          provenance_hash: provenanceHash.trim(),
        }),
      });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.success) throw new Error(data.error || 'Artwork submission failed.');

      setStatus({ loading: false, success: `Artwork ${data.artwork?.id ?? ''} was added to the gallery.` });
      setTitle('');
      setMedium('');
      setDimensions('');
      setPriceCents('');
      setImageUrl('');
      setProvenanceHash('');
      onSuccess?.();
    } catch (error) {
      setStatus({ loading: false, error: error instanceof Error ? error.message : 'Artwork submission failed.' });
    }
  };

  const inputClass = 'w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';
  return (
    <section className="mx-auto mb-8 max-w-xl rounded-lg border border-purple-500/30 bg-slate-900 p-6 font-mono text-slate-100">
      <h2 className="mb-4 text-lg font-bold text-purple-300">List an original artwork</h2>
      {status.error && <p className="mb-3 text-sm text-red-300" role="alert">{status.error}</p>}
      {status.success && <p className="mb-3 text-sm text-emerald-300" role="status">{status.success}</p>}
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block text-xs text-slate-300">Creator account username or ID
          <input className={inputClass} required minLength={1} maxLength={100} value={creator} onChange={(event) => setCreator(event.target.value)} autoComplete="username" />
        </label>
        <label className="block text-xs text-slate-300">Artwork title
          <input className={inputClass} required minLength={1} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="block text-xs text-slate-300">Medium
          <input className={inputClass} required maxLength={100} value={medium} onChange={(event) => setMedium(event.target.value)} placeholder="Oil on canvas, digital, ..." />
        </label>
        <label className="block text-xs text-slate-300">Dimensions (optional)
          <input className={inputClass} maxLength={100} value={dimensions} onChange={(event) => setDimensions(event.target.value)} />
        </label>
        <label className="block text-xs text-slate-300">Price (cents)
          <input className={inputClass} type="number" required min="1" max="100000000" step="1" value={priceCents} onChange={(event) => setPriceCents(event.target.value)} />
        </label>
        <label className="block text-xs text-slate-300">Image URL
          <input className={inputClass} type="url" required maxLength={2048} value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" />
        </label>
        <label className="block text-xs text-slate-300">Provenance SHA-256 hash
          <input className={inputClass} required pattern="(?:0x)?[a-fA-F0-9]{64}" title="Enter a 64-character SHA-256 hex digest, optionally prefixed with 0x" value={provenanceHash} onChange={(event) => setProvenanceHash(event.target.value)} placeholder="64 hex characters" />
        </label>
        <p className="text-xs text-slate-400">Submit the SHA-256 digest of the artwork asset. The server stores it as artwork metadata; it does not verify ownership or mint a blockchain token.</p>
        <button className="w-full rounded bg-purple-500 px-4 py-2 font-bold text-slate-950 disabled:opacity-50" type="submit" disabled={status.loading}>
          {status.loading ? 'Submitting…' : 'Add to gallery'}
        </button>
      </form>
    </section>
  );
}
