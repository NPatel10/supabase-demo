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

export type BookUpdate = Partial<BookInsert>
