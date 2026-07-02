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
        /**
         * Rolldown-native chunk groups (first match wins).
         * Note: the legacy `manualChunks` function compat silently failed to place the
         * CJS react runtime (react/jsx-runtime ended up hosted inside codemirror-vendor,
         * making the 650 KB CodeMirror bundle a static dependency of the entry chunk).
         */
        advancedChunks: {
          // Match modules individually (rollup `manualChunks` semantics). Without this,
          // a group recursively captures its whole dependency closure — the first group
          // would swallow antd/react/lucide and balloon to ~700 KB.
          includeDependenciesRecursively: false,
          groups: [
            { name: 'data-table', test: /[\\/]src[\\/]components[\\/]ui-kit[\\/]data-table[\\/]/ },
            // CodeEditorInner is lazy-loaded (it pulls CodeMirror) — excluded from the
            // eager ui-kit group so codemirror-vendor is not statically imported at boot.
            { name: 'ui-kit', test: /[\\/]src[\\/]components[\\/]ui-kit[\\/](?!CodeEditorInner)/ },
            { name: 'react-vendor', test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler)[\\/]/ },
            { name: 'router-vendor', test: /[\\/]node_modules[\\/]react-router/ },
            { name: 'query-vendor', test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query/ },
            { name: 'table-vendor', test: /[\\/]node_modules[\\/]@tanstack[\\/]react-(?:table|virtual)/ },
            { name: 'xyflow-vendor', test: /[\\/]node_modules[\\/]@xyflow[\\/]react/ },
            { name: 'chart-vendor', test: /[\\/]node_modules[\\/]recharts/ },
            // AntD 6 pulls @rc-component/* (rc-* is the legacy namespace)
            { name: 'antd-vendor', test: /[\\/]node_modules[\\/](?:antd[\\/]|@ant-design[\\/]|@rc-component[\\/]|rc-)/ },
            { name: 'codemirror-vendor', test: /[\\/]node_modules[\\/](?:@uiw[\\/]|@codemirror[\\/]|codemirror[\\/])/ },
          ],
        },
      },
    },
  },
})
