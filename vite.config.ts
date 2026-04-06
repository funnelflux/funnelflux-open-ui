import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/** Backend (Docker publishes app on host port 8080). Override for non-default hosts, e.g. `http://172.26.0.1:8080`. */
const devApiTarget = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  base: '/v2-ui/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // PHP admin (login.php, etc.) + V2 API — same origin as the dev server so session cookies work
      '/admin': {
        target: devApiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
