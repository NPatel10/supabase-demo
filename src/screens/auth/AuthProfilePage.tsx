import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/screens/auth/useAuth"
import { formatDate, type ProfileDraft } from "./utils"
import { useEffect, useState, type SubmitEventHandler } from "react"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

const emptyProfile: ProfileDraft = {
  email: "",
  displayName: "",
  username: "",
}

export default function AuthProfilePage() {
  const auth = useAuth()

  console.log(auth.profile)
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfile)

  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (auth.profile && auth.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft({
        displayName: auth.profile?.display_name ?? "",
        username: auth.profile?.username ?? "",
        email: auth.user?.email ?? "",
      })
    }
  }, [auth.profile, auth.user])

  useEffect(() => {
    if (!auth.isSessionLoading && !auth.session) {
      navigate("/auth/sign-in")
    }
  }, [auth.isSessionLoading, auth.session, navigate])

  const handleDraftChange = (key: keyof ProfileDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleProfileSave: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    if (!auth.user) {
      setError("Sign in to save a profile.")
      return
    }

    setError(null)

    auth.saveProfileMutation.mutate({
      userId: auth.user.id,
      displayName: draft.displayName,
      username: draft.username,
      email: draft.email,
    })
  }

  const resetDraft = () => {
    setDraft({
      displayName: auth.profile?.display_name ?? "",
      username: auth.profile?.username ?? "",
      email: auth.user?.email ?? "",
    })
  }

  const handleSignOut = () => {
    auth.signOutMutation.mutate(undefined, {
      onSuccess: () => navigate("/auth/sign-in")
    })
  }

  return (
    <section className="grid gap-6">
      <Card className="w-lg mx-auto border-muted/60 bg-white/80 backdrop-blur">
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle className="text-lg">User profile</CardTitle>
            <Button
              onClick={handleSignOut}
              disabled={auth.isProfileLoading}
              variant={"destructive"}
            >
              Sign out
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!auth.user ? (
            <Empty className="border-dashed">
              <EmptyHeader>
                <EmptyTitle>Sign in to edit your profile</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                Once authenticated, you can create your display name, handle, and
                status for the chat app.
              </EmptyContent>
            </Empty>
          ) : (
            <form className="grid gap-4" onSubmit={handleProfileSave}>
              <div className="grid gap-2">
                <Label htmlFor="profile-name">Display name</Label>
                <Input
                  id="profile-name"
                  value={draft.displayName}
                  onChange={(event) => handleDraftChange("displayName", event.target.value)}
                  disabled={auth.isProfileLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-handle">Username</Label>
                <Input
                  id="profile-handle"
                  value={draft.username}
                  onChange={(event) => handleDraftChange("username", event.target.value)}
                  disabled={auth.isProfileLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-status">Email</Label>
                <Textarea
                  id="profile-status"
                  value={draft.email}
                  onChange={(event) => handleDraftChange("email", event.target.value)}
                  rows={3}
                  disabled={auth.isProfileLoading}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={auth.isProfileLoading}>
                  {auth.isProfileLoading && <Spinner />}
                  Save profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetDraft}
                  disabled={auth.isProfileLoading}
                >
                  Clear
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Profile created: {auth.profile ? formatDate(auth.profile.created_at) : ""}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
