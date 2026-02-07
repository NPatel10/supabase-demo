import { useCallback, useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import { LogIn, LogOut, MessageCircle, ShieldCheck, UserPlus } from "lucide-react"

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
import { supabase, supabaseConfig } from "@/lib/supabaseClient"
import type { Profile } from "@/types/profile"

type SignUpDraft = {
  email: string
  password: string
  displayName: string
  username: string
}

type SignInDraft = {
  email: string
  password: string
}

type ProfileDraft = {
  displayName: string
  username: string
  status: string
}

const emptySignUp: SignUpDraft = {
  email: "",
  password: "",
  displayName: "",
  username: "",
}

const emptySignIn: SignInDraft = {
  email: "",
  password: "",
}

const emptyProfile: ProfileDraft = {
  displayName: "",
  username: "",
  status: "",
}

function formatDate(value: string | null) {
  if (!value) {
    return "—"
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "—"
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

export default function AuthDemo() {
  const [session, setSession] = useState<Session | null>(null)
  const [signUpDraft, setSignUpDraft] = useState<SignUpDraft>(emptySignUp)
  const [signInDraft, setSignInDraft] = useState<SignInDraft>(emptySignIn)
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfile)
  const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileNotice, setProfileNotice] = useState<string | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isProfileSaving, setIsProfileSaving] = useState(false)

  const isConfigured = supabaseConfig.isConfigured
  const user = session?.user ?? null

  const profileSummary = useMemo(() => {
    const handle = profileDraft.username.trim()
    const displayName = profileDraft.displayName.trim()
    if (!handle && !displayName) {
      return "Add a handle and display name to personalize your chat identity."
    }
    const identity = displayName || handle
    return `Profile ready for chat as ${identity}${handle ? ` (@${handle})` : ""}.`
  }, [profileDraft.displayName, profileDraft.username])

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
      setAuthError(null)
      setAuthNotice(null)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const loadProfile = useCallback(async () => {
    if (!isConfigured || !user) {
      setProfileDraft(emptyProfile)
      setProfileCreatedAt(null)
      return
    }

    setIsProfileLoading(true)
    setProfileError(null)

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, status, created_at")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      setProfileError(error.message)
      setProfileDraft(emptyProfile)
      setProfileCreatedAt(null)
      setIsProfileLoading(false)
      return
    }

    const profile = (data ?? null) as Profile | null

    if (!profile) {
      setProfileDraft({
        displayName: user.user_metadata?.display_name ?? "",
        username: user.user_metadata?.username ?? "",
        status: "",
      })
      setProfileCreatedAt(null)
    } else {
      setProfileDraft({
        displayName: profile.display_name ?? "",
        username: profile.username ?? "",
        status: profile.status ?? "",
      })
      setProfileCreatedAt(profile.created_at ?? null)
    }

    setIsProfileLoading(false)
  }, [isConfigured, user])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isConfigured) {
      setAuthError("Supabase is not configured yet.")
      return
    }

    if (!signUpDraft.email.trim() || !signUpDraft.password.trim()) {
      setAuthError("Email and password are required.")
      return
    }

    setIsAuthLoading(true)
    setAuthError(null)
    setAuthNotice(null)

    const { data, error } = await supabase.auth.signUp({
      email: signUpDraft.email.trim(),
      password: signUpDraft.password,
      options: {
        data: {
          display_name: signUpDraft.displayName.trim() || undefined,
          username: signUpDraft.username.trim() || undefined,
        },
      },
    })

    if (error) {
      setAuthError(error.message)
      setIsAuthLoading(false)
      return
    }

    if (data.session) {
      setAuthNotice("Account created and you are signed in.")
      setSignUpDraft(emptySignUp)
    } else {
      setAuthNotice(
        "Account created. Check your email to confirm, then sign in."
      )
    }

    setIsAuthLoading(false)
  }

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isConfigured) {
      setAuthError("Supabase is not configured yet.")
      return
    }

    if (!signInDraft.email.trim() || !signInDraft.password.trim()) {
      setAuthError("Email and password are required.")
      return
    }

    setIsAuthLoading(true)
    setAuthError(null)
    setAuthNotice(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: signInDraft.email.trim(),
      password: signInDraft.password,
    })

    if (error) {
      setAuthError(error.message)
      setIsAuthLoading(false)
      return
    }

    setAuthNotice("Signed in.")
    setIsAuthLoading(false)
  }

  const handleSignOut = async () => {
    if (!isConfigured) {
      setAuthError("Supabase is not configured yet.")
      return
    }

    setIsAuthLoading(true)
    setAuthError(null)
    setAuthNotice(null)

    const { error } = await supabase.auth.signOut()

    if (error) {
      setAuthError(error.message)
    } else {
      setAuthNotice("Signed out.")
    }

    setIsAuthLoading(false)
  }

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isConfigured || !user) {
      setProfileError("Sign in to save a profile.")
      return
    }

    setIsProfileSaving(true)
    setProfileError(null)
    setProfileNotice(null)

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: profileDraft.displayName.trim() || null,
      username: profileDraft.username.trim() || null,
      status: profileDraft.status.trim() || null,
    })

    if (error) {
      setProfileError(error.message)
      setIsProfileSaving(false)
      return
    }

    setProfileNotice("Profile saved.")
    setIsProfileSaving(false)
    void loadProfile()
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-2">
          <ShieldCheck className="size-3" />
          Auth + Profiles
        </Badge>
        <Badge variant={isConfigured ? "secondary" : "destructive"}>
          {isConfigured ? "Connected" : "Missing env"}
        </Badge>
        <Badge variant="outline" className="gap-2">
          <MessageCircle className="size-3" />
          Chat-ready identity
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

      {authError && (
        <Alert variant="destructive">
          <AlertTitle>Authentication failed</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      {authNotice && (
        <Alert>
          <AlertTitle>Auth update</AlertTitle>
          <AlertDescription>{authNotice}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <Card className="border-muted/60 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserPlus className="size-5 text-emerald-600" />
                Create a chat account
              </CardTitle>
              <CardDescription>
                New users register with an email + password. Profile fields map to
                the <code>profiles</code> table for RLS-friendly identity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleSignUp}>
                <div className="grid gap-2">
                  <Label htmlFor="sign-up-email">Email</Label>
                  <Input
                    id="sign-up-email"
                    type="email"
                    autoComplete="email"
                    value={signUpDraft.email}
                    onChange={(event) =>
                      setSignUpDraft((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    placeholder="you@chatapp.dev"
                    disabled={!isConfigured || Boolean(session)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sign-up-password">Password</Label>
                  <Input
                    id="sign-up-password"
                    type="password"
                    autoComplete="new-password"
                    value={signUpDraft.password}
                    onChange={(event) =>
                      setSignUpDraft((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Minimum 6 characters"
                    disabled={!isConfigured || Boolean(session)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sign-up-name">Display name</Label>
                  <Input
                    id="sign-up-name"
                    value={signUpDraft.displayName}
                    onChange={(event) =>
                      setSignUpDraft((prev) => ({
                        ...prev,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder="e.g. Ayesha Patel"
                    disabled={!isConfigured || Boolean(session)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sign-up-handle">Handle</Label>
                  <Input
                    id="sign-up-handle"
                    value={signUpDraft.username}
                    onChange={(event) =>
                      setSignUpDraft((prev) => ({
                        ...prev,
                        username: event.target.value,
                      }))
                    }
                    placeholder="e.g. ayesha_dev"
                    disabled={!isConfigured || Boolean(session)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!isConfigured || Boolean(session) || isAuthLoading}
                >
                  {isAuthLoading && <Spinner />}
                  Create account
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-muted/60 bg-white/75 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LogIn className="size-5 text-sky-600" />
                Sign in
              </CardTitle>
              <CardDescription>
                Existing users log in to start chatting and update their profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleSignIn}>
                <div className="grid gap-2">
                  <Label htmlFor="sign-in-email">Email</Label>
                  <Input
                    id="sign-in-email"
                    type="email"
                    autoComplete="email"
                    value={signInDraft.email}
                    onChange={(event) =>
                      setSignInDraft((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    placeholder="you@chatapp.dev"
                    disabled={!isConfigured || Boolean(session)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sign-in-password">Password</Label>
                  <Input
                    id="sign-in-password"
                    type="password"
                    autoComplete="current-password"
                    value={signInDraft.password}
                    onChange={(event) =>
                      setSignInDraft((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Your password"
                    disabled={!isConfigured || Boolean(session)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!isConfigured || Boolean(session) || isAuthLoading}
                >
                  {isAuthLoading && <Spinner />}
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="border-muted/60 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Chat profile</CardTitle>
              <CardDescription>
                Each user owns exactly one row in <code>profiles</code>. RLS
                policies allow updates only to the signed-in user.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {profileError && (
                <Alert variant="destructive">
                  <AlertTitle>Profile error</AlertTitle>
                  <AlertDescription>{profileError}</AlertDescription>
                </Alert>
              )}
              {profileNotice && (
                <Alert>
                  <AlertTitle>Profile saved</AlertTitle>
                  <AlertDescription>{profileNotice}</AlertDescription>
                </Alert>
              )}

              {!user ? (
                <Empty className="border-dashed">
                  <EmptyHeader>
                    <EmptyTitle>Sign in to edit your profile</EmptyTitle>
                  </EmptyHeader>
                  <EmptyContent>
                    Once authenticated, you can create your display name, handle,
                    and status for the chat app.
                  </EmptyContent>
                </Empty>
              ) : (
                <form className="grid gap-4" onSubmit={handleProfileSave}>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-name">Display name</Label>
                    <Input
                      id="profile-name"
                      value={profileDraft.displayName}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          displayName: event.target.value,
                        }))
                      }
                      placeholder="Name shown in chat"
                      disabled={isProfileLoading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-handle">Handle</Label>
                    <Input
                      id="profile-handle"
                      value={profileDraft.username}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          username: event.target.value,
                        }))
                      }
                      placeholder="Unique chat handle"
                      disabled={isProfileLoading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-status">Status</Label>
                    <Textarea
                      id="profile-status"
                      value={profileDraft.status}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                      placeholder="e.g. Shipping the realtime demo ✨"
                      rows={3}
                      disabled={isProfileLoading}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>{profileSummary}</span>
                    {isProfileLoading && <Spinner />}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      disabled={isProfileSaving || isProfileLoading}
                    >
                      {isProfileSaving && <Spinner />}
                      Save profile
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProfileDraft(emptyProfile)}
                      disabled={isProfileSaving}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Profile created: {formatDate(profileCreatedAt)}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border-muted/60 bg-white/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Session</CardTitle>
              <CardDescription>
                Use this session data to personalize chat messages and presence.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!user ? (
                <div className="text-sm text-muted-foreground">
                  No active session.
                </div>
              ) : (
                <div className="grid gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">User ID:</span>{" "}
                    <span className="font-mono text-xs">{user.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {user.email ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last sign-in:</span>{" "}
                    {formatDate(user.last_sign_in_at ?? null)}
                  </div>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSignOut()}
                disabled={!user || isAuthLoading}
                className="gap-2"
              >
                {isAuthLoading && <Spinner />}
                <LogOut className="size-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-muted/60 bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Chat data model</CardTitle>
          <CardDescription>
            Auth (profiles) and Realtime (messages) share the same chat domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-neutral-900">profiles</span> — one
            row per user, locked by RLS.
          </div>
          <div>
            <span className="font-medium text-neutral-900">messages</span> — rows
            authored by users, streamed live in the Realtime demo.
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
