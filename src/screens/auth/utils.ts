export type SignUpDraft = {
  email: string
  password: string
  displayName: string
  username: string
}

export type SignInDraft = {
  email: string
  password: string
}

export type ProfileDraft = {
  displayName: string
  username: string
  email: string
}

export function formatDate(value: string | null) {
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
