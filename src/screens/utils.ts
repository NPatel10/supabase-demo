import type { Profile } from "@/types/profile"

export function getInitials(value: string) {
  if (!value.trim()) {
	return "?"
  }
  const parts = value.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const second = parts[1]?.[0] ?? ""
  return `${first}${second}`.toUpperCase()
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

export function formatDateTime(value: string | null) {
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
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

export function formatTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "unknown"
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

export function formatUsername(profile: Profile | undefined, fallbackUserId: string) {
  return profile?.display_name?.trim()
    ?? profile?.username?.trim()
    ?? `User ${fallbackUserId.slice(0, 6)}`
}

export function formatProfileHandle(profile: Profile | undefined) {
  const username = profile?.username?.trim() ?? ""
  return username ? `@${username}` : "No username"
}
