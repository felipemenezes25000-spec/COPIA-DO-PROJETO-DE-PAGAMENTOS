import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync } from 'fs';

function spaFallbackPlugin(): Plugin {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    writeBundle() {
      const outDir = resolve(__dirname, 'dist');
      const src = resolve(outDir, 'index.html');
      if (existsSync(src)) {
        copyFileSync(src, resolve(outDir, '404.html'));
        console.log('Copied index.html → 404.html for SPA fallback on S3');
      }
    },
  };
}

// COOP/COEP necessários para o popup do Google Identity Services (GIS)
// funcionar sem o aviso "Cross-Origin-Opener-Policy policy would block the
// window.postMessage call". 'same-origin-allow-popups' mantém o isolamento
// da janela principal mas permite postMessage vindo do popup OAuth.
const googleOAuthHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Embedder-Policy': 'unsafe-none',
};

export default defineConfig({
  plugins: [react(), spaFallbackPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    headers: googleOAuthHeaders,
  },
  preview: {
    headers: googleOAuthHeaders,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-framer': ['framer-motion'],
        },
      },
    },
  },
});
