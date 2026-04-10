export function LoginPage() {
  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <div className="bg-surface rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-foreground mb-2">FunnelFlux</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Sign in through the main FunnelFlux admin to use the V2 UI.
        </p>

        <div className="space-y-4">
          <div className="bg-surface-secondary text-muted-foreground text-sm p-4 rounded-md border border-border">
            This UI now uses the existing PHP admin session on the same origin.
            Open the main admin, log in there, then return here.
          </div>

          <a
            href="/admin/login.php"
            className="block w-full bg-primary text-primary-foreground py-2 px-4 rounded-md text-sm font-medium hover:bg-primary-hover text-center"
          >
            Open Admin Login
          </a>
        </div>
      </div>
    </div>
  )
}
