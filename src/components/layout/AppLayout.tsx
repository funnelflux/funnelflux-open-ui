import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
