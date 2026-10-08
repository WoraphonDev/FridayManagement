import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vibeStyles } from './scripts/vibe-styles.ts';
import { pwaWorker } from './scripts/pwa-worker.ts';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export default defineConfig({
  root: 'frontend',
  plugins: [
    react(),
    vibeStyles(),
    {
      name: 'friday-public-static-worker',
      generateBundle(_options, bundle) {
        const hash = createHash('sha256');
        for (const name of [
          'offline.html',
          'manifest.webmanifest',
          'favicon.svg',
          'icon-192.png',
          'icon-512.png',
        ])
          hash.update(readFileSync(`frontend/public/${name}`));
        this.emitFile({
          type: 'asset',
          fileName: 'service-worker.js',
          source: pwaWorker(bundle, hash.digest('hex')),
        });
      },
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': `http://127.0.0.1:${process.env.PORT ?? 3000}`,
      '/health': `http://127.0.0.1:${process.env.PORT ?? 3000}`,
    },
  },
  build: { outDir: '../dist/frontend', emptyOutDir: true, sourcemap: false },
});
