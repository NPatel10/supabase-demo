export type Message = {
  id: number | string
  sender_user_id: string
  receiver_user_id: string
  body: string
  created_at: string
}

export type MessageInsert = {
  sender_user_id: string
  receiver_user_id: string
  body: string
}
