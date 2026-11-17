import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface PortalImmersiveArtwork {
  id: string;
  title: string;
  imageUrl: string;
}

interface EngineProps {
  mode: 'art-gallery' | 'chess-arena';
  artworks?: PortalImmersiveArtwork[];
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80';

export const PortalImmersiveEngine: React.FC<EngineProps> = ({ mode, artworks = [] }) => {
  const [unavailable, setUnavailable] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = Math.max(mount.clientWidth, 1);
    const height = Math.max(mount.clientHeight, 1);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, mode === 'chess-arena' ? 7 : 2.4, mode === 'chess-arena' ? 8 : 8);
    if (mode === 'chess-arena') camera.lookAt(0, 0, 0);
    else camera.lookAt(0, 1.5, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (error) {
      console.error('Unable to initialize the Portal immersive engine:', error);
      setUnavailable(true);
      mount.dataset.webglUnavailable = 'true';
      return () => { delete mount.dataset.webglUnavailable; };
    }

    setUnavailable(false);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', mode === 'chess-arena' ? 'Interactive 3D chess board' : '3D artwork gallery');
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const keyLight = new THREE.DirectionalLight(0xc4b5fd, 2);
    keyLight.position.set(4, 8, 6);
    scene.add(keyLight);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const interactiveObjects: THREE.Object3D[] = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let selectedPiece: THREE.Group | null = null;
    let disposed = false;

    const trackGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
      geometries.push(geometry);
      return geometry;
    };
    const trackMaterial = <T extends THREE.Material>(material: T): T => {
      materials.push(material);
      return material;
    };

    if (mode === 'art-gallery') {
      const items = artworks.length > 0 ? artworks.slice(0, 8) : [{ id: 'featured', title: 'Featured artwork', imageUrl: FALLBACK_IMAGE }];
      const spacing = 3.2;
      items.forEach((artwork, index) => {
        const x = (index - (items.length - 1) / 2) * spacing;
        const frame = new THREE.Mesh(
          trackGeometry(new THREE.BoxGeometry(2.35, 1.75, 0.12)),
          trackMaterial(new THREE.MeshStandardMaterial({ color: 0xc084fc, metalness: 0.35, roughness: 0.45 })),
        );
        frame.position.set(x, 1.5, 0);
        scene.add(frame);

        const canvas = new THREE.Mesh(
          trackGeometry(new THREE.PlaneGeometry(2.15, 1.55)),
          trackMaterial(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })),
        );
        canvas.position.set(x, 1.5, 0.071);
        canvas.userData.artwork = { id: artwork.id, title: artwork.title };
        scene.add(canvas);
        interactiveObjects.push(canvas);

        const loader = new THREE.TextureLoader();
        loader.load(
          artwork.imageUrl || FALLBACK_IMAGE,
          (texture) => {
            if (disposed) {
              texture.dispose();
              return;
            }
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            textures.push(texture);
            const material = canvas.material as THREE.MeshStandardMaterial;
            material.map = texture;
            material.color.set(0xffffff);
            material.needsUpdate = true;
          },
          undefined,
          () => {
            if (!disposed) console.warn(`Artwork texture could not be loaded: ${artwork.id}`);
          },
        );
      });
    } else {
      const board = new THREE.Group();
      scene.add(board);
      const base = new THREE.Mesh(
        trackGeometry(new THREE.BoxGeometry(8.35, 0.25, 8.35)),
        trackMaterial(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })),
      );
      base.position.y = -0.15;
      board.add(base);

      const lightSquare = trackMaterial(new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.8 }));
      const darkSquare = trackMaterial(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 }));
      for (let rank = 0; rank < 8; rank += 1) {
        for (let file = 0; file < 8; file += 1) {
          const square = new THREE.Mesh(
            trackGeometry(new THREE.BoxGeometry(1, 0.04, 1)),
            (rank + file) % 2 === 0 ? lightSquare : darkSquare,
          );
          square.position.set(file - 3.5, 0, rank - 3.5);
          board.add(square);
        }
      }

      const createPiece = (file: number, rank: number, isWhite: boolean, type: 'pawn' | 'rook' | 'king') => {
        const group = new THREE.Group();
        group.position.set(file - 3.5, 0.04, rank - 3.5);
        group.userData.baseY = group.position.y;
        group.userData.isPiece = true;
        const pieceMaterial = trackMaterial(new THREE.MeshStandardMaterial({
          color: isWhite ? 0xfbbf24 : 0x1e293b,
          metalness: isWhite ? 0.55 : 0.25,
          roughness: 0.35,
        }));
        const baseMesh = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.32, 0.38, 0.16, 24)), pieceMaterial);
        baseMesh.position.y = 0.08;
        group.add(baseMesh);
        const bodyHeight = type === 'king' ? 0.95 : type === 'rook' ? 0.72 : 0.48;
        const body = new THREE.Mesh(
          trackGeometry(new THREE.CylinderGeometry(type === 'pawn' ? 0.16 : 0.23, type === 'pawn' ? 0.27 : 0.31, bodyHeight, 24)),
          pieceMaterial,
        );
        body.position.y = 0.16 + bodyHeight / 2;
        group.add(body);
        const crown = new THREE.Mesh(
          trackGeometry(type === 'rook' ? new THREE.BoxGeometry(0.48, 0.15, 0.48) : new THREE.SphereGeometry(type === 'king' ? 0.19 : 0.17, 16, 12)),
          pieceMaterial,
        );
        crown.position.y = 0.16 + bodyHeight + 0.06;
        group.add(crown);
        if (type !== 'pawn') interactiveObjects.push(group);
        group.traverse((child) => { if (child instanceof THREE.Mesh) child.userData.pieceRoot = group; });
        scene.add(group);
      };

      for (let file = 0; file < 8; file += 1) {
        createPiece(file, 1, true, 'pawn');
        createPiece(file, 6, false, 'pawn');
      }
      createPiece(0, 0, true, 'rook');
      createPiece(7, 0, true, 'rook');
      createPiece(4, 0, true, 'king');
      createPiece(0, 7, false, 'rook');
      createPiece(7, 7, false, 'rook');
      createPiece(4, 7, false, 'king');
    }

    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveObjects, true);
      if (!hits.length) return;

      if (mode === 'chess-arena') {
        const piece = hits[0].object.userData.pieceRoot as THREE.Group | undefined
          ?? (hits[0].object.userData.isPiece ? hits[0].object as THREE.Group : undefined);
        if (!piece) return;
        if (selectedPiece && selectedPiece !== piece) selectedPiece.position.y = selectedPiece.userData.baseY as number;
        selectedPiece = selectedPiece === piece ? null : piece;
        if (selectedPiece) selectedPiece.position.y = (selectedPiece.userData.baseY as number) + 0.45;
      } else {
        const artwork = hits[0].object.userData.artwork as { title?: string } | undefined;
        if (artwork?.title) mount.dataset.selectedArtwork = artwork.title;
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const render = () => {
      if (disposed) return;
      renderer.render(scene, camera);
    };
    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      render();
    };
    animate();

    const resize = () => {
      const nextWidth = mount.clientWidth;
      const nextHeight = mount.clientHeight;
      if (!nextWidth || !nextHeight) return;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
      render();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
          meshMaterials.forEach((material) => material.dispose());
        }
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      delete mount.dataset.webglUnavailable;
      delete mount.dataset.selectedArtwork;
    };
  }, [mode, artworks]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 420, overflow: 'hidden', border: '1px solid rgba(168,85,247,.4)', borderRadius: 12, background: '#020617' }}>
      <div style={{ position: 'absolute', zIndex: 1, top: 12, left: 12, padding: '5px 10px', border: '1px solid rgba(34,211,238,.3)', borderRadius: 5, background: 'rgba(15,23,42,.9)', color: '#22d3ee', font: '10px ui-monospace,monospace', pointerEvents: 'none' }}>
        {mode === 'art-gallery' ? 'Immersive art gallery' : '3D chess arena'}
      </div>
      {unavailable && <p role="status" style={{ position: 'relative', zIndex: 1, padding: '60px 24px', color: '#e2e8f0' }}>3D viewing is unavailable in this browser.{mode === 'art-gallery' ? ' Explore the catalog below.' : ' Please use a browser with WebGL support.'}</p>}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, cursor: mode === 'chess-arena' ? 'pointer' : 'grab' }} />
    </div>
  );
};

export default PortalImmersiveEngine;
