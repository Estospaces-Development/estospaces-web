import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'maps';
          }

          if (id.includes('framer-motion')) {
            return 'motion';
          }

          if (id.includes('jspdf') || id.includes('xlsx')) {
            return 'documents';
          }

          if (id.includes('@tanstack/react-query')) {
            return 'query';
          }

          if (
            id.includes('react-dom') ||
            id.includes('react-router-dom') ||
            id.includes('react')
          ) {
            return 'react-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
});
