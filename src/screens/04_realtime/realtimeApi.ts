import { supabase } from "@/lib/supabaseClient"
import type { Message, MessageInsert } from "@/types/message"
import type { Profile } from "@/types/profile"

const MESSAGE_LIMIT = 50

export async function listMessages(
  currentUserId: string,
  recipientUserId: string
): Promise<Message[]> {
  const conversationFilter =
    `and(sender_user_id.eq.${currentUserId},receiver_user_id.eq.${recipientUserId}),` +
    `and(sender_user_id.eq.${recipientUserId},receiver_user_id.eq.${currentUserId})`

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_user_id, receiver_user_id, body, created_at")
    .or(conversationFilter)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_LIMIT)

  if (error) {
    throw error
  }

  return (data ?? []) as Message[]
}

export async function listRecipients(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, created_at")
    .order("display_name", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as Profile[]
}

export async function createMessage(payload: MessageInsert): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("id, sender_user_id, receiver_user_id, body, created_at")
    .single()

  if (error) {
    throw error
  }

  return data as Message
}

export function appendMessage(messages: Message[] | undefined, message: Message): Message[] {
  const existing = messages ?? []

  if (!existing.some((item) => item.id === message.id)) {
    existing.push(message)
  }
  
  return existing
}

export function isMessageInConversation(
  message: Message,
  currentUserId: string,
  recipientUserId: string
) {
  const sentByCurrentUser =
    message.sender_user_id === currentUserId &&
    message.receiver_user_id === recipientUserId
  const receivedByCurrentUser =
    message.sender_user_id === recipientUserId &&
    message.receiver_user_id === currentUserId

  return sentByCurrentUser || receivedByCurrentUser
}