import { useState } from "react"
import type { FormEvent } from "react"
import { BookOpen, Database, RefreshCcw, ShieldCheck } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createBook, deleteBook, listBooks, updateBook } from "@/lib/bookStoreApi"
import { supabaseConfig } from "@/lib/supabaseClient"
import type { Book } from "@/types/book"

type DraftBook = {
  title: string
  author: string
  genre: string
  publishedYear: string
}

type SavePayload = {
  id?: Book["id"]
  title: string
  author: string
  genre: string | null
  publishedYear: number | null
}

const emptyDraft: DraftBook = {
  title: "",
  author: "",
  genre: "",
  publishedYear: "",
}

function toDisplayDate(value: string) {
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

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-xl border bg-neutral-950 text-neutral-100">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-neutral-400">
        <span>{title}</span>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed text-neutral-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default function ApiExplorer() {
  const [draft, setDraft] = useState<DraftBook>(emptyDraft)
  const [selected, setSelected] = useState<Book | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<Book["id"] | null>(null)

  const isConfigured = supabaseConfig.isConfigured
  const queryClient = useQueryClient()

  const restEndpoint = supabaseConfig.supabaseUrl
    ? `${supabaseConfig.supabaseUrl}/rest/v1/book_store`
    : "https://YOUR_PROJECT.supabase.co/rest/v1/book_store"

  const restHeaders = [
    "apikey: <PUBLISHABLE_KEY>",
    "Authorization: Bearer <PUBLISHABLE_KEY>",
    "Content-Type: application/json",
  ]

  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: listBooks,
    enabled: isConfigured,
    staleTime: 1000 * 30,
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: SavePayload) => {
      if (payload.id) {
        return updateBook(payload.id, {
          title: payload.title,
          author: payload.author,
          genre: payload.genre,
          published_year: payload.publishedYear,
        })
      }

      return createBook({
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
    mutationFn: async (book: Book) => deleteBook(book.id),
    onMutate: (book) => {
      setDeletingId(book.id)
    },
    onSettled: () => {
      setDeletingId(null)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books"] })
    },
  })

  const books = booksQuery.data ?? []
  const isLoading = booksQuery.isLoading
  const isRefreshing = booksQuery.isFetching
  const isSaving = saveMutation.isPending
  const errorMessage =
    formError ??
    (saveMutation.error instanceof Error ? saveMutation.error.message : null) ??
    (deleteMutation.error instanceof Error ? deleteMutation.error.message : null) ??
    (booksQuery.error instanceof Error ? booksQuery.error.message : null)

  const handleDraftChange = (key: keyof DraftBook, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isConfigured) {
      setFormError("Supabase is not configured yet.")
      return
    }

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
    if (!isConfigured) {
      setFormError("Supabase is not configured yet.")
      return
    }

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
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-2">
          <Database className="size-3" />
          Auto-generated APIs
        </Badge>
        <Badge variant={isConfigured ? "secondary" : "destructive"}>
          {isConfigured ? "Connected" : "Missing env"}
        </Badge>
        <Badge variant="outline" className="gap-2">
          <ShieldCheck className="size-3" />
          REST + JS Client
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-muted/60 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="size-5 text-emerald-600" />
              Book Store CRUD
            </CardTitle>
            <CardDescription>
              Create and edit records in <span className="font-medium">book_store</span>{" "}
              using Supabase&apos;s auto-generated APIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {!isConfigured && (
              <Alert>
                <AlertTitle>Set your project keys</AlertTitle>
                <AlertDescription>
                  Fill in <code>.env.local</code> with your Supabase URL and
                  publishable key, then restart the dev server.
                </AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={draft.title}
                    onChange={(event) =>
                      handleDraftChange("title", event.target.value)
                    }
                    placeholder="e.g. The Left Hand of Darkness"
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
                    placeholder="e.g. Ursula K. Le Guin"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    value={draft.genre}
                    onChange={(event) =>
                      handleDraftChange("genre", event.target.value)
                    }
                    placeholder="e.g. Science Fiction"
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
                    placeholder="e.g. 1969"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isSaving || !isConfigured}>
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

            <div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
              <span>{books.length} records</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void booksQuery.refetch()}
                disabled={!isConfigured || isRefreshing}
              >
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Auto-generated API Calls</CardTitle>
            <CardDescription>
              Supabase exposes every table automatically through REST. Copy these
              examples directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Tabs defaultValue="rest">
              <TabsList>
                <TabsTrigger value="rest">REST</TabsTrigger>
                <TabsTrigger value="client">JS Client</TabsTrigger>
              </TabsList>
              <TabsContent value="rest" className="grid gap-3">
                <CodeBlock
                  title="GET /book_store"
                  code={`curl '${restEndpoint}?select=*'\n${restHeaders
                    .map((header) => `  -H "${header}"`)
                    .join(" \\\n")}`}
                />
                <CodeBlock
                  title="POST /book_store"
                  code={`curl -X POST '${restEndpoint}' \\\n${restHeaders
                    .map((header) => `  -H "${header}"`)
                    .join(" \\\n")} \\\n  -d '{"title":"Dune","author":"Frank Herbert","genre":"Sci-Fi","published_year":1965}'`}
                />
              </TabsContent>
              <TabsContent value="client" className="grid gap-3">
                <CodeBlock
                  title="Supabase JS"
                  code={`const { data } = await supabase\n  .from('book_store')\n  .select('*')\n\nawait supabase\n  .from('book_store')\n  .insert({ title: 'Dune', author: 'Frank Herbert' })`}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/60 bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Live Data</CardTitle>
          <CardDescription>
            Records below come directly from the auto-generated API.
          </CardDescription>
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
                    <TableCell>{toDisplayDate(book.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
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
    </section>
  )
}
