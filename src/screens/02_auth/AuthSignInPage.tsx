import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/screens/02_auth/useAuth"
import { LogIn } from "lucide-react"
import { useEffect, useState, type SubmitEventHandler } from "react"
import type { SignInDraft } from "@/types/auth"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Alert, AlertDescription } from "@/components/ui/alert"

const emptySignIn: SignInDraft = {
  email: "",
  password: "",
}

export default function AuthSignInPage() {
  const [draft, setDraft] = useState(emptySignIn)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hasSession = Boolean(auth.session)

  useEffect(() => {
    if (!auth.isSessionLoading && auth.session) {
      navigate("/auth/profile")
      return
    }

    if (location.search == '?info=ac-created') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInfo("Account created. Verification email is sent.")
    }
  }, [auth.isSessionLoading, auth.session, navigate, location, setInfo])

  const handleDraftChange = (key: keyof SignInDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleSignIn: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    if (!draft.email.trim() || !draft.password.trim()) {
      setError("Email and password are required.")
      return
    }

    setError("")

    auth.signInMutation.mutate({
      email: draft.email.trim(),
      password: draft.password,
    }, {
      onSuccess: () => {
        navigate("/auth/profile")
      },
      onError: (data) => {
        setError(data.message ?? "Invalid email or password")
      }
    })
  }

  return (
    <section className="grid gap-6">
      {info && (
        <Alert className="w-lg mx-auto">
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="w-lg mx-auto">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className="w-lg mx-auto border-border/70 bg-card/85 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LogIn className="size-5 text-primary" />
            Sign in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSignIn}>
            <div className="grid gap-2">
              <Label htmlFor="sign-in-email">Email</Label>
              <Input
                id="sign-in-email"
                type="email"
                autoComplete="email"
                value={draft.email}
                onChange={(event) => handleDraftChange("email", event.target.value)}
                disabled={hasSession}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sign-in-password">Password</Label>
              <Input
                id="sign-in-password"
                type="password"
                autoComplete="current-password"
                value={draft.password}
                onChange={(event) => handleDraftChange("password", event.target.value)}
                disabled={hasSession}
              />
            </div>
            <Button type="submit" disabled={hasSession || auth.signInMutation.isPending}>
              {auth.signInMutation.isPending && <Spinner />}
              Sign in
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Need an account?</span>
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth/sign-up">Sign up</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
