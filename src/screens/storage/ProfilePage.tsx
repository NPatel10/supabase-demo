import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/screens/auth/useAuth"
import { formatDate, type ProfileDraft } from "../auth/utils"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type SubmitEventHandler,
} from "react"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { getAvatarPublicUrl } from "./storageApi"
import { getInitials } from "./type"
import { Pencil } from "lucide-react"

type StorageProfileDraft = ProfileDraft & { avatar_url: string }

const emptyProfile: StorageProfileDraft = {
  email: "",
  displayName: "",
  username: "",
  avatar_url: "",
}

export default function StorageProfilePage() {
  const auth = useAuth()

  const [draft, setDraft] = useState<StorageProfileDraft>(emptyProfile)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (auth.profile && auth.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft({
        displayName: auth.profile?.display_name ?? "",
        username: auth.profile?.username ?? "",
        email: auth.user?.email ?? "",
        avatar_url: auth.profile?.avatar_url ?? "",
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

  const avatarUrl = useMemo(() => {
    if (previewUrl) {
      return previewUrl
    }
    if (!draft.avatar_url) {
      return null
    }
    return getAvatarPublicUrl(draft.avatar_url)
  }, [draft.avatar_url, previewUrl])

  const initials = useMemo(() => {
    const base = draft.displayName || draft.email || ""
    return getInitials(base)
  }, [draft.displayName, draft.email])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null)

    const file = event.target.files?.[0] ?? null
    if (!file) {
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.")
      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.")
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => setPreviewUrl(reader.result as string)

    setSelectedFile(file)
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
    setSelectedFile(null)
    setPreviewUrl(null)
    setDraft({
      displayName: auth.profile?.display_name ?? "",
      username: auth.profile?.username ?? "",
      email: auth.user?.email ?? "",
      avatar_url: auth.profile?.avatar_url ?? "",
    })
  }

  const handleSignOut = () => {
    auth.signOutMutation.mutate(undefined, {
      onSuccess: () => navigate("/auth/sign-in")
    })
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
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
              <div className="flex flex-col items-center gap-4">
                <div className="relative mx-auto">
                  <Avatar className="size-30">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Profile avatar" />
                    ) : null}
                    <AvatarFallback className="text-5xl">{initials}</AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="icon-lg"
                    variant="default"
                    className="absolute -right-1 -bottom-1 rounded-full"
                    onClick={openFilePicker}
                    disabled={auth.isProfileLoading}
                    aria-label="Select profile image"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Input
                    ref={fileInputRef}
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={auth.isProfileLoading}
                    className="hidden"
                  />
                </div>
                <span className="text-red-500">Choose PNG, JPG, or WebP image up to 5MB.</span>
              </div>
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
