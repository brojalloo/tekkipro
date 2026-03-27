import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tekkipro/shared': path.resolve(__dirname, '../packages/shared/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: true,
  },
  server: {
    host: true,   // expose sur 0.0.0.0 → accessible depuis le réseau local
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-router-dom')) return 'router-vendor'
          if (id.includes('react-hot-toast') || id.includes('react-icons')) return 'ui-vendor'
          if (id.includes('recharts')) return 'charts-vendor'
          if (id.includes('axios')) return 'http-vendor'
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor'
        },
      },
    },
  },
})
