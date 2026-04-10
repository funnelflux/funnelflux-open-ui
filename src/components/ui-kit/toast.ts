import { App } from 'antd'

/**
 * Lightweight snackbar toast API.
 * Uses antd message (not notification) — single-line, top-center, auto-dismiss.
 * Requires antd <App> wrapper in the component tree.
 *
 * Usage:
 *   const toast = useToastApi()
 *   toast.success('Saved')
 *   toast.error('Failed to save')
 */
export function useToastApi() {
  const { message } = App.useApp()

  return {
    success: (content: string) => message.success({ content, duration: 2 }),
    error: (content: string) => message.error({ content, duration: 3 }),
    info: (content: string) => message.info({ content, duration: 2 }),
    warning: (content: string) => message.warning({ content, duration: 2 }),
    loading: (content: string) => message.loading({ content, duration: 0 }),
    destroy: () => message.destroy(),
  }
}
