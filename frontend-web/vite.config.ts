import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Copia index.html para 404.html no build — CDN/servidor estático (ex.: CloudFront/S3) pode servir 404.html em rotas inexistentes, permitindo SPA routing */
function copyIndexTo404() {
  return {
    name: 'copy-index-to-404',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      const indexPath = path.join(outDir, 'index.html');
      const notFoundPath = path.join(outDir, '404.html');
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
        console.log('Copied index.html to 404.html for SPA fallback');
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyIndexTo404()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — compartilhado por todos os portais
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // TanStack Query — separado para não bloquear landing page
          'vendor-query': ['@tanstack/react-query'],
          // UI libs usadas em todo o app
          'vendor-ui': ['framer-motion', 'sonner', 'lucide-react'],
          // Radix primitives (usadas só no portal médico e admin)
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
          ],
          // SignalR — carregado só quando portal médico precisa
          'vendor-signalr': ['@microsoft/signalr'],
        },
      },
    },
  },
  // PWA: Vite copies everything in /public to dist/ automatically
  publicDir: 'public',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    env: {
      VITE_API_URL: 'https://api.test.example.com',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/', '**/*.test.*', '**/*.spec.*'],
    },
  },
});
