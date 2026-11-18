import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Root storefront/auth APIs are served by the root Worker.
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // The main application uses the root Worker domain-record APIs.
      '/v1': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
