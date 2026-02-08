import { useState, type SubmitEventHandler } from "react"
import { BookOpen, Pen } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createBook, deleteBook, listBooks, updateBook } from "@/screens/01_bookstore/bookStoreApi"
import { emptyDraft, type Book, type DraftBook, type SavePayload } from "@/types/book"
import { formatDate } from "@/screens/utils"

export default function BookStore() {
  const [draft, setDraft] = useState<DraftBook>(emptyDraft)
  const [selected, setSelected] = useState<Book | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<Book["id"] | null>(null)

  const queryClient = useQueryClient()

  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: listBooks,                                        // <----- Supabase API handler
    staleTime: 1000 * 30,
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: SavePayload) => {
      if (payload.id) {
        return updateBook(payload.id, {                        // <----- Supabase API handler
          title: payload.title,
          author: payload.author,
          genre: payload.genre,
          published_year: payload.publishedYear,
        })
      }

      return createBook({                                      // <----- Supabase API handler
        title: payload.title,
        author: payload.author,
        genre: payload.genre,
        published_year: payload.publishedYear,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (book: Book) => deleteBook(book.id),     // <----- Supabase API handler
    onMutate: (book) => setDeletingId(book.id),
    onSettled: () => setDeletingId(null),
    onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ["books"] }),
  })

  const books = booksQuery.data ?? []
  const isLoading = booksQuery.isLoading
  const isSaving = saveMutation.isPending
  const errorMessage =
    formError ??
    (saveMutation.error instanceof Error ? saveMutation.error.message : null) ??
    (deleteMutation.error instanceof Error ? deleteMutation.error.message : null) ??
    (booksQuery.error instanceof Error ? booksQuery.error.message : null)

  const handleDraftChange = (key: keyof DraftBook, value: string) => setDraft((prev) => ({ ...prev, [key]: value }))

  const resetDraft = () => {
    setDraft(emptyDraft)
    setSelected(null)
    setFormError(null)
  }

  const handleEdit = (book: Book) => {
    setSelected(book)
    setFormError(null)
    setDraft({
      title: book.title,
      author: book.author,
      genre: book.genre ?? "",
      publishedYear: book.published_year?.toString() ?? "",
    })
  }

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()

    if (!draft.title.trim() || !draft.author.trim()) {
      setFormError("Title and author are required.")
      return
    }

    const cleanedYear = draft.publishedYear.trim()
    const parsedYear = cleanedYear ? Number(cleanedYear) : null
    if (cleanedYear && Number.isNaN(parsedYear)) {
      setFormError("Published year must be a number.")
      return
    }

    setFormError(null)
    try {
      const payload: SavePayload = {
        id: selected?.id,
        title: draft.title.trim(),
        author: draft.author.trim(),
        genre: draft.genre.trim() || null,
        publishedYear: parsedYear,
      }
      await saveMutation.mutateAsync(payload)
      resetDraft()
    } catch (err) {
      if (!(err instanceof Error)) {
        setFormError("Failed to save book.")
      }
    }
  }

  const handleDelete = async (book: Book) => {
    const approved = window.confirm(
      `Delete "${book.title}" by ${book.author}? This cannot be undone.`
    )
    if (!approved) {
      return
    }

    setFormError(null)
    try {
      await deleteMutation.mutateAsync(book)
    } catch (err) {
      if (!(err instanceof Error)) {
        setFormError("Failed to delete book.")
      }
    }
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-[0.65fr_1.35fr]">
        <Card className="border-border/70 bg-card/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Pen className="size-5 text-primary" />
              Create/Update Form
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 grid-cols-1">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={draft.title}
                    onChange={(event) =>
                      handleDraftChange("title", event.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={draft.author}
                    onChange={(event) =>
                      handleDraftChange("author", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 grid-cols-1">
                <div className="grid gap-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    value={draft.genre}
                    onChange={(event) =>
                      handleDraftChange("genre", event.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year">Published Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={draft.publishedYear}
                    onChange={(event) =>
                      handleDraftChange("publishedYear", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Spinner />}
                  {selected ? "Update Book" : "Create Book"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetDraft}
                  disabled={isSaving}
                >
                  Clear
                </Button>
                {selected && (
                  <Badge variant="outline" className="gap-2">
                    Editing <span className="font-semibold">{selected.title}</span>
                  </Badge>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              Book Store
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Loading records...
              </div>
            ) : books.length === 0 ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>No books yet</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Add your first record to see the REST API results populate here.
                </EmptyContent>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">{book.title}</TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell>{book.genre ?? "-"}</TableCell>
                      <TableCell>{book.published_year ?? "-"}</TableCell>
                      <TableCell>{formatDate(book.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(book)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleDelete(book)}
                            disabled={deletingId === book.id}
                          >
                            {deletingId === book.id && <Spinner />}
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
