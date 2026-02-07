import type { FileObject } from "@supabase/storage-js"

import { supabase } from "@/lib/supabaseClient"
import type { Profile } from "@/types/profile"

export const AVATAR_BUCKET = "avatars"

export type ProfileUpdate = {
  displayName?: string | null
  username?: string | null
  status?: string | null
  avatarUrl?: string | null
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, status, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data ?? null) as Profile | null
}

export async function upsertProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<Profile> {
  const payload: Record<string, string | null> = { id: userId }

  if (Object.prototype.hasOwnProperty.call(updates, "displayName")) {
    payload.display_name = updates.displayName ?? null
  }
  if (Object.prototype.hasOwnProperty.call(updates, "username")) {
    payload.username = updates.username ?? null
  }
  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    payload.status = updates.status ?? null
  }
  if (Object.prototype.hasOwnProperty.call(updates, "avatarUrl")) {
    payload.avatar_url = updates.avatarUrl ?? null
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select("id, display_name, username, status, avatar_url, created_at")
    .single()

  if (error) {
    throw error
  }

  return data as Profile
}

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "png"
  const cleanedName = file.name.replace(/[^a-z0-9.\-_]/gi, "_")
  const filePath = `${userId}/${Date.now()}-${cleanedName || `avatar.${extension}`}`

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || "image/*",
      upsert: false,
    })

  if (error) {
    throw error
  }

  return filePath
}

export async function listAvatarFiles(userId: string): Promise<FileObject[]> {
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(userId, {
      limit: 50,
      sortBy: { column: "created_at", order: "desc" },
    })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function deleteAvatar(path: string): Promise<void> {
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path])

  if (error) {
    throw error
  }
}

export function getAvatarPublicUrl(path: string): string {
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
