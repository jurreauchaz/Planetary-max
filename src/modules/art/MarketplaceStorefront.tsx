import React from 'react';
import type { Artwork } from '../../shared/types';
import { ArtworkVisual } from './CanvasWorkstation';
export default function MarketplaceStorefront({art,onInspect}:{art:Artwork;onInspect:()=>void}) { return <article className="art-card"><button className="art-card-image" onClick={onInspect} aria-label={`Inspect ${art.title}`}><ArtworkVisual art={art}/><span className="art-inspect">INSPECT ↗</span></button><div className="art-card-caption"><div><span className="micro-label">{art.category} / {art.year}</span><h3>{art.title}</h3><p>{art.artist}</p></div><button className="round-arrow" onClick={onInspect} aria-label={`Open ${art.title}`}>↗</button></div></article>; }
