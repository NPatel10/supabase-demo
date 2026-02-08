export type Book = {
  id: number | string
  title: string
  author: string
  genre: string | null
  published_year: number | null
  created_at: string
}

export type BookInsert = {
  title: string
  author: string
  genre?: string | null
  published_year?: number | null
}

export type DraftBook = {
  title: string
  author: string
  genre: string
  publishedYear: string
}

export type SavePayload = {
  id?: Book["id"]
  title: string
  author: string
  genre: string | null
  publishedYear: number | null
}

export const emptyDraft: DraftBook = {
  title: "",
  author: "",
  genre: "",
  publishedYear: "",
}

export type BookUpdate = Partial<BookInsert>
