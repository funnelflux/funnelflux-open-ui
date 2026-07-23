import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State { hasError: boolean; error: Error | null }

/**
 * Lazy-chunk fetch failures (stale hashed files after a redeploy) — resetting
 * component state cannot fix these; only a full page reload gets the new build.
 */
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false
  const message = error.message ?? ''
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Importing a module script failed')
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
    this.props.onError?.(error, info)
  }

  render() {
    if (this.state.hasError) {
      if (isChunkLoadError(this.state.error)) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
            <h2 className="text-lg font-bold text-foreground mb-2">A new version is available</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Part of the app failed to load, likely because it was updated. Reload to get the latest version.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-primary underline"
            >
              Reload page
            </button>
          </div>
        )
      }
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
          <h2 className="text-lg font-bold text-destructive mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-sm text-primary underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
