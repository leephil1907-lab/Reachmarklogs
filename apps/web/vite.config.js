import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // The hosted preview proxies this dev server through a dynamic host,
    // so every host/origin must be permitted or the iframe shows a blank page.
    allowedHosts: true,
    cors: true,
    hmr: { clientPort: undefined },
    proxy: {
      // Studio (MoneyPrinterTurbo FastAPI service) — optional, only if running.
      '/studio-api': {
        target: 'http://127.0.0.1:8501',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/studio-api/, ''),
      },
      // Reachmark Node API (apps/api) — optional, only if running.
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1200 },
})
