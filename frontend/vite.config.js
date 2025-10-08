/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Listen on all interfaces (simpler than 0.0.0.0)
    strictPort: true, // Force port 3000, don't fallback
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})