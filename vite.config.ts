import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function normalizeUiBase(value: string): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/+$/, '') || '/'
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const uiBase = normalizeUiBase(env.VITE_UI_BASENAME || '/v2-ui')
  /** Backend (Docker publishes app on host port 8080). Override for non-default hosts. */
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    base: `${uiBase === '/' ? '' : uiBase}/`,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // PHP admin + V2 API share the dev-server origin so session cookies work.
        '/admin': {
          target: devApiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      rolldownOptions: {
        output: {
          /**
           * Rolldown-native chunk groups (first match wins).
           * Note: the legacy `manualChunks` function compat silently failed to place the
           * CJS react runtime (react/jsx-runtime ended up hosted inside codemirror-vendor,
           * making the 650 KB CodeMirror bundle a static dependency of the entry chunk).
           */
          codeSplitting: {
            // Match modules individually (rollup `manualChunks` semantics). Without this,
            // a group recursively captures its whole dependency closure — the first group
            // would swallow antd/react/lucide and balloon to ~700 KB.
            includeDependenciesRecursively: false,
            // Each vendor group must list its package's transitive vendor deps: a shared
            // node_modules module left unmatched can get hoisted into an app chunk, creating
            // a circular chunk import whose evaluation order runs one chunk's top level
            // before the other's. That crashed boot once: dayjs's CommonJS wrapper landed in
            // an app chunk and ui-kit's top-level `dayjs.extend(...)` ran before the wrapper
            // var was assigned ("et is not a function").
            groups: [
            { name: 'data-table', test: /[\\/]src[\\/]components[\\/]ui-kit[\\/]data-table[\\/]/ },
            // CodeEditorInner is lazy-loaded (it pulls CodeMirror) — excluded from the
            // eager ui-kit group so codemirror-vendor is not statically imported at boot.
            { name: 'ui-kit', test: /[\\/]src[\\/]components[\\/]ui-kit[\\/](?!CodeEditorInner)/ },
            // zustand rides with react: it is shared by app stores and @xyflow/react, and
            // its entry modules (vanilla/traditional/shallow) must not float into app chunks.
            // use-sync-external-store is a React shim shared by zustand and react-redux.
            { name: 'react-vendor', test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler|zustand|use-sync-external-store)[\\/]/ },
            { name: 'router-vendor', test: /[\\/]node_modules[\\/]react-router/ },
            // (?:react-)? so the headless cores (query-core, table-core, virtual-core)
            // stay with their react wrappers instead of floating into app chunks.
            { name: 'query-vendor', test: /[\\/]node_modules[\\/]@tanstack[\\/](?:react-)?query/ },
            { name: 'table-vendor', test: /[\\/]node_modules[\\/]@tanstack[\\/](?:react-)?(?:table|virtual)/ },
            // d3 is shared by @xyflow/system (drag/zoom/selection) and recharts'
            // victory-vendor (scale/shape/…) — one leaf chunk both can import.
            { name: 'd3-vendor', test: /[\\/]node_modules[\\/](?:d3-|victory-vendor[\\/]|internmap[\\/])/ },
            { name: 'xyflow-vendor', test: /[\\/]node_modules[\\/](?:@xyflow[\\/]|classcat[\\/])/ },
            // recharts 3 ships an internal redux store (@reduxjs/toolkit, react-redux, immer, …)
            { name: 'chart-vendor', test: /[\\/]node_modules[\\/](?:recharts[\\/]|tiny-invariant[\\/]|decimal\.js-light[\\/]|es-toolkit[\\/]|eventemitter3[\\/]|immer[\\/]|reselect[\\/]|react-redux[\\/]|@reduxjs[\\/]|redux(?:-thunk)?[\\/])/ },
            // AntD 6 pulls @rc-component/* (rc-* is the legacy namespace); dayjs is
            // DatePicker's date lib (CJS); is-mobile is @rc-component/util's (CJS).
            { name: 'antd-vendor', test: /[\\/]node_modules[\\/](?:antd[\\/]|@ant-design[\\/]|@rc-component[\\/]|rc-|dayjs[\\/]|is-mobile[\\/])/ },
            // Keep the lazy React wrapper separate from CodeMirror's one-way core dependency
            // graph so neither cacheable chunk becomes a single oversized release asset.
            { name: 'codemirror-wrapper-vendor', test: /[\\/]node_modules[\\/](?:@uiw[\\/]|codemirror[\\/])/ },
            { name: 'codemirror-core-vendor', test: /[\\/]node_modules[\\/]@codemirror[\\/]/ },
            { name: 'codemirror-parser-vendor', test: /[\\/]node_modules[\\/](?:@lezer[\\/]|@marijn[\\/]|style-mod[\\/]|w3c-keyname[\\/]|crelt[\\/])/ },
            ],
          },
        },
      },
    },
  }
})
