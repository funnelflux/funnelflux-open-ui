export function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">FunnelFlux</h1>
        <p className="text-slate-500 text-sm mb-6">
          Sign in through the main FunnelFlux admin to use the V2 UI.
        </p>

        <div className="space-y-4">
          <div className="bg-slate-50 text-slate-600 text-sm p-4 rounded-md border border-slate-200">
            This UI now uses the existing PHP admin session on the same origin.
            Open the main admin, log in there, then return here.
          </div>

          <a
            href="/admin/login.php"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 text-center"
          >
            Open Admin Login
          </a>
        </div>
      </div>
    </div>
  )
}
