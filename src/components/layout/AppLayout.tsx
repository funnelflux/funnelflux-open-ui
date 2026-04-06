import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col p-6">
        <Outlet />
      </main>
    </div>
  )
}
