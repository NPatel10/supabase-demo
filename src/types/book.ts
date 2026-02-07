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

export function toDisplayDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown"
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed)
}

export type BookUpdate = Partial<BookInsert>
