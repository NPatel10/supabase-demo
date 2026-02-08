import { FlaskConical, Folder, Lock, Radio, Table2 } from "lucide-react"
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom"

import BookStore from "@/screens/01_bookstore/BookStore"
import AuthProfilePage from "@/screens/02_auth/AuthProfilePage"
import AuthSignInPage from "@/screens/02_auth/AuthSignInPage"
import AuthSignUpPage from "@/screens/02_auth/AuthSignUpPage"
import RealtimeDemo from "@/screens/04_realtime/RealtimeDemo"
import EdgeFnDemo from "@/screens/05_edge_fn/EdgeFnDemo"
import { cn } from "@/lib/utils"
import StorageProfilePage from "@/screens/03_storage/ProfilePage"

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

const isNavItemMatch = (pathname: string, itemPath: string) => {
  if (itemPath.startsWith("/auth/")) {
    return pathname.startsWith("/auth")
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

const getActiveNavIndex = (pathname: string) => {
  const index = navItems.findIndex((item) => isNavItemMatch(pathname, item.path))
  return index === -1 ? 0 : index
}

function App() {
  const location = useLocation()
  const activeIndex = getActiveNavIndex(location.pathname)
  const progressPercent =
    navItems.length > 1 ? (activeIndex / (navItems.length - 1)) * 100 : 0
  const connectorInset = `${100 / (navItems.length * 2)}%`

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_top,#ef44442e_0%,transparent_55%),radial-gradient(900px_circle_at_80%_20%,#b91c1c26_0%,transparent_45%),radial-gradient(700px_circle_at_10%_90%,#f9731630_0%,transparent_50%)] opacity-90" />
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col gap-10 px-6 py-8 md:px-10">
        <header className="flex flex-col gap-6">
          <nav className="overflow-x-auto pb-2">
            <div className="relative mx-auto min-w-140 px-2 sm:px-6">
              <div
                className="pointer-events-none absolute top-6 h-1 rounded-full bg-border/70"
                style={{ left: connectorInset, right: connectorInset }}
              />
              <div
                className="pointer-events-none absolute top-6 h-1 rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{
                  left: connectorInset,
                  width: `calc((100% - (${connectorInset} * 2)) * ${progressPercent / 100})`,
                }}
              />

              <div className="relative grid grid-cols-5 gap-3 sm:gap-4">
                {navItems.map((item, index) => {
                  const isCompleted = index <= activeIndex
                  const isCurrent = index === activeIndex
                  const Icon = item.icon

                  return (
                    <NavLink
                      key={item.label}
                      to={item.path}
                      className="group flex flex-col items-center gap-2 outline-none"
                    >
                      <span
                        className={cn(
                          "z-10 flex h-12 w-12 items-center justify-center rounded-full border transition-colors duration-300",
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card/80 text-muted-foreground group-hover:border-primary/60 group-hover:text-foreground",
                        )}
                      >
                        <Icon size={22} />
                      </span>
                      <h2
                        className={cn(
                          "text-center text-xs font-bold leading-tight transition-colors sm:text-sm",
                          isCurrent ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {item.label}
                      </h2>
                    </NavLink>
                  )
                })}
              </div>
            </div>
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
            <Route path="*" element={<Navigate to="/book-store" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-border/70 pt-4 text-xs text-muted-foreground">
          copyright 2026
        </footer>
      </div>
    </div>
  )
}

export default App
