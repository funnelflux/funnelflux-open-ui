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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.includes('/src/components/ui-kit/data-table/')) return 'data-table'
            if (id.includes('/src/components/ui-kit/')) return 'ui-kit'
            return undefined
          }

          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react-vendor'
          }
          if (id.includes('/node_modules/react-router')) return 'router-vendor'
          if (id.includes('/node_modules/@tanstack/react-query')) return 'query-vendor'
          if (
            id.includes('/node_modules/@tanstack/react-table') ||
            id.includes('/node_modules/@tanstack/react-virtual')
          ) {
            return 'table-vendor'
          }
          if (id.includes('/node_modules/@xyflow/react')) return 'xyflow-vendor'
          if (id.includes('/node_modules/recharts')) return 'chart-vendor'
          if (
            id.includes('/node_modules/antd/') ||
            id.includes('/node_modules/@ant-design/') ||
            id.includes('/node_modules/rc-')
          ) {
            return 'antd-vendor'
          }
          if (
            id.includes('/node_modules/@uiw/') ||
            id.includes('/node_modules/@codemirror/') ||
            id.includes('/node_modules/codemirror/')
          ) {
            return 'codemirror-vendor'
          }
          return undefined
        },
      },
    },
  },
})
