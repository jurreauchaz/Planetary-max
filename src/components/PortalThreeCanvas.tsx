import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface ThreeCanvasProps {
  moduleType?: 'chess' | 'art' | 'sports' | 'core';
}

export const PortalThreeCanvas: React.FC<ThreeCanvasProps> = ({ moduleType = 'core' }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = Math.max(mount.clientWidth, 1);
    const height = Math.max(mount.clientHeight, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 5;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (error) {
      console.error('Unable to initialize the Portal 3D canvas:', error);
      mount.dataset.webglUnavailable = 'true';
      return () => { delete mount.dataset.webglUnavailable; };
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.setAttribute('aria-label', `${moduleType} Three.js scene`);
    renderer.domElement.setAttribute('role', 'img');
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const pointLight = new THREE.PointLight(0xa855f7, 2, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    let geometry: THREE.BufferGeometry;
    let material: THREE.MeshStandardMaterial;
    if (moduleType === 'chess') {
      geometry = new THREE.CylinderGeometry(0.8, 1, 2.5, 32);
      material = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });
    } else if (moduleType === 'art') {
      geometry = new THREE.BoxGeometry(2.5, 1.8, 0.1);
      material = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, metalness: 0.5 });
    } else if (moduleType === 'sports') {
      geometry = new THREE.IcosahedronGeometry(1.25, 1);
      material = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.35, metalness: 0.5, wireframe: true });
    } else {
      geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
      material = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.4 });
    }

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    let frameId = 0;
    let disposed = false;
    const animate = () => {
      if (disposed) return;
      frameId = requestAnimationFrame(animate);
      mesh.rotation.x += 0.005;
      mesh.rotation.y += 0.008;
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const nextWidth = mount.clientWidth;
      const nextHeight = mount.clientHeight;
      if (nextWidth === 0 || nextHeight === 0) return;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      delete mount.dataset.webglUnavailable;
    };
  }, [moduleType]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 120, overflow: 'hidden', border: '1px solid rgba(168,85,247,.3)', borderRadius: 8, background: '#020617' }}>
      <div style={{ position: 'absolute', zIndex: 1, top: 8, left: 8, padding: '4px 7px', border: '1px solid rgba(168,85,247,.2)', borderRadius: 4, background: 'rgba(15,23,42,.85)', color: '#c084fc', font: '10px ui-monospace,monospace' }}>
        Three.js WebGL Context // {moduleType.toUpperCase()} Renderer
      </div>
      <div ref={mountRef} data-webgl-unavailable="false" style={{ position: 'absolute', inset: 0, cursor: 'grab' }} />
    </div>
  );
};

export default PortalThreeCanvas;
