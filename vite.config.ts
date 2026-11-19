import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function crownCoverAsset(): Plugin {
  return {
    name: 'crown-cover-static-asset',
    apply: 'build',
    closeBundle() {
      const outputDirectory = resolve(process.cwd(), 'dist', 'assets');
      mkdirSync(outputDirectory, { recursive: true });
      copyFileSync(
        resolve(process.cwd(), 'assets', 'Gemini_Generated_Image.jpeg.png'),
        resolve(outputDirectory, 'crown-cover.png'),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), crownCoverAsset()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
      '/v1': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
});
