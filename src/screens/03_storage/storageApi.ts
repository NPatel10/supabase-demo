import { supabase } from "@/lib/supabaseClient"

export const AVATAR_BUCKET = "avatars"

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

export async function deleteAvatar(path: string): Promise<void> {
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path])

  if (error) {
    throw error
  }
}

export function getAvatarPublicUrl(path: string): string {
  if (!path) {
    return ""
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
