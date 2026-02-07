import { FlaskConical, Lock, Radio, Sparkles, Table2 } from "lucide-react"
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import ApiExplorer from "@/screens/ApiExplorer"
import AuthDemo from "@/screens/AuthDemo"
import EdgeFnDemo from "@/screens/EdgeFnDemo"
import RealtimeDemo from "@/screens/RealtimeDemo"
import StorageDemo from "@/screens/StorageDemo"

const navItems = [
  {
    path: "/",
    label: "Auto-generated APIs",
    icon: Table2,
    title: "Auto-generated APIs Explorer",
    description:
      "Focused screens for each Supabase feature. This section highlights the REST endpoints that Supabase generates for every table.",
    focus: "Auto-generated APIs",
  },
  {
    path: "/auth",
    label: "Auth + Profiles",
    icon: Lock,
    title: "Auth + Profiles for Chat Apps",
    description:
      "Create users, sign in, and manage a chat profile. This screen sets up the identity layer that the Realtime chat demo will consume next.",
    focus: "Auth + Profiles",
  },
  {
    path: "/realtime",
    label: "Realtime Chat",
    icon: Radio,
    title: "Realtime Chat Feed",
    description:
      "Subscribe to live message inserts and watch new chat activity roll in across tabs.",
    focus: "Realtime Chat",
  },
  {
    path: "/storage",
    label: "Storage",
    icon: Sparkles,
    title: "Storage for Avatars",
    description:
      "Upload and serve chat avatars. Keep profile images and chat media in storage buckets.",
    focus: "Storage",
  },
  {
    path: "/edge",
    label: "Edge Functions",
    icon: FlaskConical,
    title: "Edge Functions for Chat Ops",
    description:
      "Run server-side logic for moderation, signed URLs, and other sensitive chat workflows.",
    focus: "Edge Functions",
  },
]

function App() {
  const location = useLocation()
  const activeItem =
    navItems.find((item) => item.path === location.pathname) ?? navItems[0]

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f7f4ee] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_top,_#bbf7d0_0%,transparent_50%),radial-gradient(900px_circle_at_80%_20%,_#fef3c7_0%,transparent_40%),radial-gradient(700px_circle_at_10%_90%,_#c7d2fe_0%,transparent_45%)] opacity-80" />
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col gap-10 px-6 py-8 md:px-10">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">Supabase Demo</Badge>
                <Badge variant="secondary">Chat track</Badge>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">
                {activeItem.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                {activeItem.description}
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-xs text-neutral-600 shadow-sm">
              <div className="font-semibold text-neutral-900">
                Current focus
              </div>
              {activeItem.focus}
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className="outline-none"
                >
                  {({ isActive }) => (
                    <Badge
                      variant={isActive ? "default" : "outline"}
                      className="gap-2 px-3 py-1"
                    >
                      <Icon className="size-3" />
                      {item.label}
                    </Badge>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </header>

        <main className="flex flex-1 flex-col gap-6">
          <Routes>
            <Route path="/" element={<ApiExplorer />} />
            <Route path="/auth" element={<AuthDemo />} />
            <Route path="/realtime" element={<RealtimeDemo />} />
            <Route path="/storage" element={<StorageDemo />} />
            <Route path="/edge" element={<EdgeFnDemo />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-white/60 pt-4 text-xs text-neutral-500">
          Next up: keep building the modules under <code>src/screens</code>{" "}
          while reusing the shared chat data model.
        </footer>
      </div>
    </div>
  )
}

export default App
