import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { 'jsx-a11y': jsxA11y },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      ...Object.fromEntries(
        Object.entries(jsxA11y.flatConfigs.recommended.rules ?? {})
          .map(([k, v]) => {
            if (Array.isArray(v)) return [k, ['warn', ...v.slice(1)]]
            return [k, v === 'error' || v === 2 ? 'warn' : v]
          })
      ),
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/ui-kit/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'dayjs',
              message:
                'Use date-fns in app code. dayjs is restricted to ui-kit DatePicker wrappers only.',
            },
            {
              name: 'antd',
              message:
                'Import UI primitives from "@/components/ui-kit" instead of importing Ant Design directly.',
            },
          ],
          patterns: [
            {
              group: ['antd/*'],
              message:
                'Import UI primitives from "@/components/ui-kit" instead of importing Ant Design modules directly.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/ui-kit/DatePicker.tsx'],
    rules: {
      // Object.assign(DatePicker, { RangePicker }) mirrors antd’s static API, not a second component.
      'react-refresh/only-export-components': 'off',
    },
  },
])
