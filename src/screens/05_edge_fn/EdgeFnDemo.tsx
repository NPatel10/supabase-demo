import { useEffect, useState, type SubmitEventHandler } from "react"
import type { Session } from "@supabase/supabase-js"
import { useMutation } from "@tanstack/react-query"
import { FlaskConical, ShieldCheck, Sparkles, Zap } from "lucide-react"

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
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabaseClient"

type JsonPayload = Record<string, unknown>

type SignedUrlRequest = {
  bucket: string
  path: string
  expiresIn?: number
}

type SignedUrlResponse = {
  bucket: string
  headers?: Record<string, string>
  method?: string
  path: string
  signedUrl: string
  token?: string
}

const DEFAULT_DOWNLOAD_EXPIRY_SECONDS = 120

function formatJson(payload: unknown) {
  return JSON.stringify(payload, null, 2)
}

export default function EdgeFnDemo() {
  const isConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  )
  const [session, setSession] = useState<Session | null>(null)
  const [helloName, setHelloName] = useState("")
  const [helloMessage, setHelloMessage] = useState("Hello from the EdgeFn demo")
  const [helloResponse, setHelloResponse] = useState<JsonPayload | null>(null)

  const [signedBucket, setSignedBucket] = useState("avatars")
  const [signedPath, setSignedPath] = useState("")
  const [downloadExpirySeconds, setDownloadExpirySeconds] = useState(
    DEFAULT_DOWNLOAD_EXPIRY_SECONDS.toString()
  )
  const [signedFormError, setSignedFormError] = useState<string | null>(null)
  const [signedResponse, setSignedResponse] = useState<SignedUrlResponse | null>(
    null
  )

  useEffect(() => {
    let isMounted = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.session)
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null)
        }
      })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const helloMutation = useMutation({
    mutationFn: async (payload: { name: string; message: string }) => {
      const { data, error } = await supabase.functions.invoke<JsonPayload>(
        "hello-world",
        {
          body: payload,
        }
      )

      if (error) {
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error("The hello-world function returned an empty response.")
      }

      return data
    },
    onMutate: () => {
      setHelloResponse(null)
    },
    onSuccess: (data) => {
      setHelloResponse(data)
    },
  })

  const signedUrlMutation = useMutation({
    mutationFn: async (payload: SignedUrlRequest) => {
      const { data, error } = await supabase.functions.invoke<SignedUrlResponse>(
        "signed-url",
        {
          body: payload,
        }
      )

      if (error) {
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error("The signed-url function returned an empty response.")
      }

      return data
    },
    onMutate: () => {
      setSignedResponse(null)
      setSignedFormError(null)
    },
    onSuccess: (data) => {
      setSignedResponse(data)
    },
  })

  const handleHelloSubmit:SubmitEventHandler = async (event) => {
    event.preventDefault()

    try {
      await helloMutation.mutateAsync({
        name: helloName.trim(),
        message: helloMessage.trim(),
      })
    } catch {
      // handled by mutation state
    }
  }

  const handleSignedSubmit: SubmitEventHandler = async (event) => {
    event.preventDefault()
    setSignedFormError(null)

    if (!session?.user) {
      setSignedFormError("Sign in to generate signed URLs.")
      return
    }

    const cleanedBucket = signedBucket.trim()
    if (!cleanedBucket) {
      setSignedFormError("Bucket is required.")
      return
    }

    const cleanedPath = signedPath.trim().replace(/^\/+/, "")
    if (!cleanedPath) {
      setSignedFormError("Path is required.")
      return
    }

    const userPrefix = `${session.user.id}/`
    if (!cleanedPath.startsWith(userPrefix)) {
      setSignedFormError(`Path must start with "${userPrefix}".`)
      return
    }

    const payload: SignedUrlRequest = {
      bucket: cleanedBucket,
      path: cleanedPath,
    }

    const parsed = Number(downloadExpirySeconds.trim())
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3600) {
      setSignedFormError("Download expiry must be an integer from 1 to 3600.")
      return
    }
    payload.expiresIn = parsed

    try {
      await signedUrlMutation.mutateAsync(payload)
    } catch {
      // handled by mutation state
    }
  }

  const helloError =
    helloMutation.error instanceof Error ? helloMutation.error.message : null
  const signedError =
    signedFormError ??
    (signedUrlMutation.error instanceof Error
      ? signedUrlMutation.error.message
      : null)

  const helloLoading = helloMutation.isPending
  const signedLoading = signedUrlMutation.isPending
  const user = session?.user ?? null

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-2">
          <FlaskConical className="size-3" />
          Edge Functions
        </Badge>
        <Badge variant={isConfigured ? "secondary" : "destructive"}>
          {isConfigured ? "Connected" : "Missing env"}
        </Badge>
        <Badge variant={user ? "secondary" : "outline"}>
          {user ? "Authenticated" : "Guest mode"}
        </Badge>
        <Badge variant="outline" className="gap-2">
          <Zap className="size-3" />
          hello-world + signed-url (download)
        </Badge>
      </div>

      {!isConfigured && (
        <Alert>
          <AlertTitle>Set your project keys</AlertTitle>
          <AlertDescription>
            Fill in <code>.env.local</code> with your Supabase URL and
            publishable key, then restart the dev server.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="border-muted/60 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">hello-world</CardTitle>
            <CardDescription>
              Invoke a simple edge function and inspect the JSON response.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {helloError && (
              <Alert variant="destructive">
                <AlertTitle>Function error</AlertTitle>
                <AlertDescription>{helloError}</AlertDescription>
              </Alert>
            )}

            <form className="grid gap-3" onSubmit={handleHelloSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="hello-name">Name</Label>
                <Input
                  id="hello-name"
                  value={helloName}
                  onChange={(event) => setHelloName(event.target.value)}
                  placeholder="Optional name"
                  disabled={!isConfigured || helloLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hello-message">Message</Label>
                <Textarea
                  id="hello-message"
                  value={helloMessage}
                  onChange={(event) => setHelloMessage(event.target.value)}
                  rows={3}
                  placeholder="Message to echo"
                  disabled={!isConfigured || helloLoading}
                />
              </div>
              <Button type="submit" disabled={!isConfigured || helloLoading}>
                {helloLoading && <Spinner />}
                Invoke hello-world
              </Button>
            </form>

            {helloResponse ? (
              <pre className="overflow-x-auto rounded-lg border border-muted/60 bg-white/70 p-3 text-xs text-neutral-700">
                {formatJson(helloResponse)}
              </pre>
            ) : (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>No response yet</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Call <code>hello-world</code> to inspect function output.
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">signed-url</CardTitle>
            <CardDescription>
              Generate signed download URLs for user-scoped storage paths.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {signedError && (
              <Alert variant="destructive">
                <AlertTitle>Function error</AlertTitle>
                <AlertDescription>{signedError}</AlertDescription>
              </Alert>
            )}

            {!user ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>Sign in to use signed-url</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Signed URL generation validates your user identity and
                  requires an authenticated session.
                </EmptyContent>
              </Empty>
            ) : (
              <form className="grid gap-3" onSubmit={handleSignedSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="signed-bucket">Bucket</Label>
                  <Input
                    id="signed-bucket"
                    value={signedBucket}
                    onChange={(event) => setSignedBucket(event.target.value)}
                    disabled={!isConfigured || signedLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signed-path">Path</Label>
                  <Input
                    id="signed-path"
                    value={signedPath}
                    onChange={(event) => setSignedPath(event.target.value)}
                    placeholder={`${user.id}/demo-file.txt`}
                    disabled={!isConfigured || signedLoading}
                  />
                  <div className="text-xs text-muted-foreground">
                    Must start with <code>{user.id}/</code>.
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="signed-expiry">Expires in (seconds)</Label>
                  <Input
                    id="signed-expiry"
                    type="number"
                    value={downloadExpirySeconds}
                    onChange={(event) =>
                      setDownloadExpirySeconds(event.target.value)
                    }
                    min={1}
                    max={3600}
                    disabled={!isConfigured || signedLoading}
                  />
                </div>

                <Button type="submit" disabled={!isConfigured || signedLoading}>
                  {signedLoading && <Spinner />}
                  Invoke signed-url
                </Button>
              </form>
            )}

            {signedResponse && (
              <div className="grid gap-2">
                <a
                  className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
                  href={signedResponse.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open signed URL
                </a>
                <pre className="overflow-x-auto rounded-lg border border-muted/60 bg-white/70 p-3 text-xs text-neutral-700">
                  {formatJson(signedResponse)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/60 bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Why it matters</CardTitle>
          <CardDescription>
            Keep sensitive storage logic on the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3" />
            Enforce user-scoped object paths before issuing URLs.
          </div>
          <div>
            Create short-lived download URLs instead of exposing bucket access.
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3" />
            Pair with Storage + Realtime for secure chat media workflows.
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
