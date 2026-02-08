import { supabase } from "@/lib/supabaseClient"
import type { Book, BookInsert, BookUpdate } from "@/types/book"

// const bookStoreTable = {
//   NAME: "book_store",
//   COL_ID: "id",
//   COL_TITLE: "title",
//   COL_AUTHOR: "autor",
//   COL_GENRE: "genre",
//   COL_PUBLISHED_YEAR: "published_year",
//   COL_CREATED_AT: "created_at",
// }

export async function listBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from("book_store")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createBook(payload: BookInsert): Promise<Book> {
  const { data, error } = await supabase
    .from("book_store")
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
    .from("book_store")
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
  const { error } = await supabase.from("book_store").delete().eq("id", id)

  if (error) {
    throw error
  }
}
