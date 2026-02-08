export type Profile = {
  id: string
  display_name: string
  username: string
  avatar_url: string
  created_at: string
}

export type ProfileDraft = Partial<{
  displayName: string
  username: string
  email: string
  avatar_url: string
}>