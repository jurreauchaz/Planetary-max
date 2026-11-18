import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Artwork } from '../../hooks/useArtworks';

type GalleryWork = Pick<Artwork, 'id' | 'title' | 'image_url' | 'artist_name'>;
export default function ImmersiveGallery<T extends GalleryWork>({ artworks, onSelect, inspectLabel = 'Inspect artwork' }: { artworks: T[]; onSelect: (art: T) => void; inspectLabel?: string }) {
  const mount = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const current = artworks[Math.min(index, artworks.length - 1)];
  useEffect(() => {
    const el = mount.current;
    if (!el || !current) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { setUnavailable(true); return; }
    setUnavailable(false);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.domElement.setAttribute('aria-label', `Immersive view of ${current.title}. Drag to orbit; use Inspect artwork for details.`);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#101510');
    const camera = new THREE.PerspectiveCamera(48, el.clientWidth / el.clientHeight, .1, 60); camera.position.set(0, 2.5, 7);
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 2, 0); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 3; controls.maxDistance = 12; controls.maxPolarAngle = Math.PI / 2;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x343a2d, 3));
    const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(0, 6, 5); scene.add(key);
    const geometries: THREE.BufferGeometry[] = []; const materials: THREE.Material[] = [];
    const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
      const geometry = new THREE.BoxGeometry(w, h, d); const material = new THREE.MeshStandardMaterial({ color, roughness: .75 });
      geometries.push(geometry); materials.push(material); const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); scene.add(mesh); return mesh;
    };
    box(18, .1, 18, 0x242d24, 0, -.05, 0); box(18, 7, .15, 0x333a31, 0, 3.5, -.25);
    box(4.3, 3.3, .18, 0x111511, 0, 2.2, 0);
    const painting = box(4, 3, .03, 0x404840, 0, 2.2, .11);
    let disposed = false; let texture: THREE.Texture | undefined;
    new THREE.TextureLoader().load(current.image_url, loaded => {
      if (disposed) { loaded.dispose(); return; }
      texture = loaded; texture.colorSpace = THREE.SRGBColorSpace;
      const aspect = loaded.image.width / loaded.image.height;
      painting.scale.set(aspect >= 4 / 3 ? 1 : aspect / (4 / 3), aspect >= 4 / 3 ? (4 / 3) / aspect : 1, 1);
      const material = painting.material as THREE.MeshStandardMaterial; material.map = loaded; material.color.set(0xffffff); material.needsUpdate = true;
    }, undefined, () => { if (!disposed) setUnavailable(true); });
    let frame = 0; const render = () => { frame = requestAnimationFrame(render); controls.update(); renderer.render(scene, camera); }; render();
    const resize = new ResizeObserver(() => { if (!el.clientWidth || !el.clientHeight) return; camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); }); resize.observe(el);
    return () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); controls.dispose(); texture?.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove(); };
  }, [current]);
  if (!current) return null;
  return <section className="immersive-gallery"><div ref={mount} className="immersive-stage">{unavailable && <img src={current.image_url} alt={current.title}/>}</div><div className="immersive-controls"><button onClick={() => setIndex((Math.min(index, artworks.length - 1) - 1 + artworks.length) % artworks.length)} aria-label="Previous artwork">←</button><div><strong>{current.title}</strong><p>{current.artist_name} · {Math.min(index + 1, artworks.length)} / {artworks.length}</p></div><button onClick={() => onSelect(current)}>{inspectLabel}</button><button onClick={() => setIndex((index + 1) % artworks.length)} aria-label="Next artwork">→</button></div><p className="quiet">Drag to orbit · Scroll or pinch to zoom · Use arrows to explore the collection</p></section>;
}
