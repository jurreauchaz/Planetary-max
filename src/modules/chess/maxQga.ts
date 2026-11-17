import type { Object3D } from 'three';

// Presentation transform only; does not alter legal moves or engine evaluation.
export function applyMaxQgaDistortion(piece: Object3D, factor: number) {
  if (!Number.isFinite(factor) || factor < 0 || factor > 1) throw new Error('Distortion factor must be between zero and one.');
  piece.scale.set(1 + factor * 0.15, 1 - factor * 0.08, 1 + factor * 0.15);
}
export async function logMaxQgaDistortion(factor: number) {
  if (!Number.isFinite(factor) || factor < 0 || factor > 1) throw new Error('Invalid distortion factor.');
  const response = await fetch('/api/beemax/nlp', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `MAX-QGA visual distortion applied with factor ${factor}` }),
  });
  if (!response.ok) throw new Error('Visual applied; telemetry could not be recorded.');
}
