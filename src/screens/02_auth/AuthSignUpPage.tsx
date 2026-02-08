import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/screens/02_auth/useAuth"
import { UserPlus } from "lucide-react"
import { useEffect, useState, type SubmitEventHandler } from "react"
import type { SignUpDraft } from "@/types/auth"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Link, useNavigate } from "react-router-dom"
import { Alert, AlertDescription } from "@/components/ui/alert"

const emptySignUp: SignUpDraft = {
  email: "",
  password: "",
  displayName: "",
  username: "",
}

export default function AuthSignUpPage() {
  const [draft, setDraft] = useState(emptySignUp)
  const [error, setError] = useState("")

  const auth = useAuth()
  const navigate = useNavigate()
  const hasSession = Boolean(auth.session)

  useEffect(() => {
    if (!auth.isSessionLoading && auth.session) {
      navigate("/auth/profile")
    }
  }, [auth.isSessionLoading, auth.session, navigate])

  const handleDraftChange = (key: keyof SignUpDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleSignUp: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    if (!draft.email.trim() || !draft.password.trim()) {
      setError("Email and password are required.")
      return
    }

    setError("")

    auth.signUpMutation.mutate({
      email: draft.email.trim(),
      password: draft.password,
      displayName: draft.displayName,
      username: draft.username,
    }, {
      onSuccess: () => {
        navigate("/auth/profile")
      },
      onError: (data) => {
        setError(data.message ?? "Failed to create account")
      }
    })
  }

  return (
    <section className="grid gap-6">
      {error && (
        <Alert variant="destructive" className="w-lg mx-auto">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className="mx-auto w-lg border-muted/60 bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="size-5 text-emerald-600" />
            Create a chat account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSignUp}>
            <div className="grid gap-2">
              <Label htmlFor="sign-up-email">Email</Label>
              <Input
                id="sign-up-email"
                type="email"
                autoComplete="email"
                value={draft.email}
                onChange={(event) =>
                  handleDraftChange("email", event.target.value)
                }
                disabled={hasSession}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sign-up-password">Password</Label>
              <Input
                id="sign-up-password"
                type="password"
                autoComplete="new-password"
                value={draft.password}
                onChange={(event) =>
                  handleDraftChange("password", event.target.value)
                }
                disabled={hasSession}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sign-up-name">Display name</Label>
              <Input
                id="sign-up-name"
                value={draft.displayName}
                onChange={(event) =>
                  handleDraftChange("displayName", event.target.value)
                }
                disabled={hasSession}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sign-up-username">Username</Label>
              <Input
                id="sign-up-username"
                value={draft.username}
                onChange={(event) =>
                  handleDraftChange("username", event.target.value)
                }
                disabled={hasSession}
              />
            </div>
            <Button type="submit" disabled={hasSession || auth.signUpMutation.isPending}>
              {auth.signUpMutation.isPending && <Spinner />}
              Create account
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Already have an account?</span>
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth/sign-in">Sign in</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
