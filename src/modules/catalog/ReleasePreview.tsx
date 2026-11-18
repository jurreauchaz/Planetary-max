import React, { useState } from 'react';
import type { DigitalProduct } from './types';
export function screenshots(product: DigitalProduct): string[] {
  try { const values: unknown = JSON.parse(product.gallery_images_json || '[]'); return Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string' && /^https:\/\//.test(v)).slice(0, 12) : []; } catch { return []; }
}
export default function ReleasePreview({ product }: { product: DigitalProduct }) {
  const [slide, setSlide] = useState(0); const [failed, setFailed] = useState(false);
  const images = [product.image_url, ...screenshots(product)]; const hasVideo = Boolean(product.preview_video_url); const count = images.length + (hasVideo ? 1 : 0);
  const video = hasVideo && slide === 0; const image = images[slide - (hasVideo ? 1 : 0)] || product.image_url;
  const select = (next: number) => { setSlide((next + count) % count); setFailed(false); };
  return <div className="release-preview"><div className="release-screen">{video ? <video key={product.preview_video_url} src={product.preview_video_url!} poster={product.image_url} controls playsInline preload="metadata" aria-label={`${product.title} video preview`} onError={() => setFailed(true)}/> : <img key={image} src={image} alt={`${product.title} · ${slide + 1} of ${count}`} onError={() => setFailed(true)}/>}{failed && <p className="preview-error" role="status">This preview could not load. {video && <a href={product.preview_video_url!} target="_blank" rel="noopener noreferrer">Open the video directly ↗</a>}</p>}</div><div className="release-filmstrip" aria-label={`${product.title} preview selection`}><button aria-label="Previous preview" onClick={() => select(slide - 1)}>←</button>{hasVideo && <button aria-label="Watch video preview" aria-pressed={video} onClick={() => select(0)}><span className="video-thumb">▷</span><small>TRAILER</small></button>}{images.map((url, index) => <button key={`${index}-${url}`} aria-label={`View screenshot ${index + 1}`} aria-pressed={slide === index + (hasVideo ? 1 : 0)} onClick={() => select(index + (hasVideo ? 1 : 0))}><img src={url} alt="" loading="lazy"/><small>{index === 0 ? 'COVER' : `SCREEN ${index}`}</small></button>)}<button aria-label="Next preview" onClick={() => select(slide + 1)}>→</button></div></div>;
}
