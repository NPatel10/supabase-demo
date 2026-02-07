import { supabase } from "@/lib/supabaseClient"
import type { Book, BookInsert, BookUpdate } from "@/types/book"

const TABLE = "book_store"

export async function listBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createBook(payload: BookInsert): Promise<Book> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateBook(
  id: Book["id"],
  payload: BookUpdate
): Promise<Book> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteBook(id: Book["id"]): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id)

  if (error) {
    throw error
  }
}
