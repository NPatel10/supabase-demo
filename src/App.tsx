import { FlaskConical, Folder, Lock, Radio, Table2 } from "lucide-react"
import { NavLink, Navigate, Route, Routes } from "react-router-dom"

import BookStore from "@/screens/BookStore"
import AuthProfilePage from "@/screens/auth/AuthProfilePage"
import AuthSignInPage from "@/screens/auth/AuthSignInPage"
import AuthSignUpPage from "@/screens/auth/AuthSignUpPage"
import EdgeFnDemo from "@/screens/EdgeFnDemo"
import RealtimeDemo from "@/screens/03_realtime/RealtimeDemo"
import { cn } from "./lib/utils"
import StorageProfilePage from "./screens/storage/ProfilePage"

const navItems = [
  {
    path: "/book-store",
    label: "Auto APIs",
    icon: Table2,
  },
  {
    path: "/auth/sign-in",
    label: "Authentication",
    icon: Lock,
  },
  {
    path: "/storage",
    label: "Storage",
    icon: Folder,
  },
  {
    path: "/realtime",
    label: "Realtime",
    icon: Radio,
  },
  {
    path: "/edge",
    label: "Edge Functions",
    icon: FlaskConical,
  },
]

function App() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f7f4ee] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_top,#bbf7d0_0%,transparent_50%),radial-gradient(900px_circle_at_80%_20%,#fef3c7_0%,transparent_40%),radial-gradient(700px_circle_at_10%_90%,#c7d2fe_0%,transparent_45%)] opacity-80" />
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col gap-10 px-6 py-8 md:px-10">
        <header className="flex flex-col gap-6">
          <nav className="flex flex-wrap gap-8 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className="outline-none w-40"
                >
                  {({ isActive }) => (
                    <div className="flex flex-col gap-2 items-center">
                      <div className={cn("p-3 border rounded-full border-gray-700", isActive ? "bg-black text-white" : "")}>
                        <Icon size={25} />
                      </div>
                      <h2 className="font-bold text-center">{isActive ? item.label : ""}</h2>
                    </div>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </header>

        <main className="flex flex-1 flex-col gap-6">
          <Routes>
            <Route path="/book-store" element={<BookStore />} />
            <Route path="/auth/sign-up" element={<AuthSignUpPage />} />
            <Route path="/auth/sign-in" element={<AuthSignInPage />} />
            <Route path="/auth/profile" element={<AuthProfilePage />} />
            <Route path="/realtime" element={<RealtimeDemo />} />
            <Route path="/storage" element={<StorageProfilePage />} />
            <Route path="/edge" element={<EdgeFnDemo />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-white/60 pt-4 text-xs text-neutral-500">
          copyright 2026
        </footer>
      </div>
    </div>
  )
}

export default App
