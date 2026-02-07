import { FlaskConical, Lock, Radio, Sparkles, Table2 } from "lucide-react"
import { NavLink, Navigate, Route, Routes } from "react-router-dom"

import BookStore from "@/screens/BookStore"
import AuthProfilePage from "@/screens/auth/AuthProfilePage"
import AuthSignInPage from "@/screens/auth/AuthSignInPage"
import AuthSignUpPage from "@/screens/auth/AuthSignUpPage"
import EdgeFnDemo from "@/screens/EdgeFnDemo"
import RealtimeDemo from "@/screens/RealtimeDemo"
import StorageDemo from "@/screens/storage/StorageDemo"
import { cn } from "./lib/utils"

const navItems = [
  {
    path: "/book-store",
    label: "Auto-generated APIs",
    icon: Table2,
    title: "Auto-generated APIs Explorer",
    description:
      "Focused screens for each Supabase feature. This section highlights the REST endpoints that Supabase generates for every table.",
    focus: "Auto-generated APIs",
  },
  {
    path: "/auth/sign-in",
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
                      <h2 className="font-bold">{isActive ? item.label : ""}</h2>
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
            <Route path="/storage" element={<StorageDemo />} />
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
