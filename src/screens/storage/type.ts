import type { Profile } from "@/types/profile"
import type { User } from "@supabase/supabase-js"

export type ProfileDraft = {
  displayName: string
  username: string
  status: string
}

export const emptyDraft: ProfileDraft = {
  displayName: "",
  username: "",
  status: "",
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "--"
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "--"
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed)
}

export function formatBytes(size?: number | null) {
  if (!size) {
    return "--"
  }
  if (size < 1024) {
    return `${size} B`
  }
  const kb = size / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }
  const mb = kb / 1024
  return `${mb.toFixed(2)} MB`
}

export function getInitials(value: string) {
  if (!value.trim()) {
    return "?"
  }
  const parts = value.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const second = parts[1]?.[0] ?? ""
  return `${first}${second}`.toUpperCase()
}

export function buildDraft(profile: Profile | null, user: User | null): ProfileDraft {
  return {
	displayName:
	  profile?.display_name ??
	  (user?.user_metadata?.display_name as string | undefined) ??
	  "",
	username:
	  profile?.username ??
	  (user?.user_metadata?.username as string | undefined) ??
	  "",
	status: profile?.status ?? "",
  }
}