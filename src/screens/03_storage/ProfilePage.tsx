import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/screens/02_auth/useAuth"
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
import { deleteAvatar, getAvatarPublicUrl, uploadAvatar } from "./storageApi"
import { Pencil } from "lucide-react"
import { formatDate, getInitials } from "@/screens/utils"
import type { ProfileDraft } from "@/types/profile"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const emptyProfile: ProfileDraft = {
  email: "",
  display_name: "",
  username: "",
  avatar_url: "",
}

export default function StorageProfilePage() {
  const auth = useAuth()

  const [draft, setDraft] = useState<ProfileDraft>(emptyProfile)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (auth.profile && auth.user) {
      setDraft({
        display_name: auth.profile?.display_name ?? "",
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
    const base = draft.display_name || draft.email || ""
    return getInitials(base)
  }, [draft.display_name, draft.email])

  const isSavingProfile = auth.saveProfileMutation.isPending || isUploadingAvatar
  const isBusy = auth.isProfileLoading || isSavingProfile

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
      setSelectedFile(null)
      setPreviewUrl(null)
      event.target.value = ""
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(`Image must be smaller than ${Math.floor(MAX_IMAGE_SIZE/1024/1024)}MB.`)
      setSelectedFile(null)
      setPreviewUrl(null)
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => setPreviewUrl(reader.result as string)

    setSelectedFile(file)
  }

  const handleProfileSave: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!auth.user) {
      setError("Sign in to save a profile.")
      return
    }

    setError(null)

    const previousAvatarPath = auth.profile?.avatar_url ?? draft.avatar_url ?? ""
    let uploadedAvatarPath: string | null = null

    try {
      let avatarPath = draft.avatar_url ?? ""
      if (selectedFile) {
        setIsUploadingAvatar(true)
        avatarPath = await uploadAvatar(auth.user.id, selectedFile)
        uploadedAvatarPath = avatarPath
        setDraft((prev) => ({
          ...prev,
          avatar_url: avatarPath,
        }))
      }

      await auth.saveProfileMutation.mutateAsync({
        display_name: draft.display_name,
        username: draft.username,
        email: draft.email,
        avatar_url: avatarPath,
      })

      if (
        uploadedAvatarPath &&
        previousAvatarPath &&
        previousAvatarPath !== uploadedAvatarPath
      ) {
        try {
          await deleteAvatar(previousAvatarPath)
        } catch {
          setError("Profile saved, but previous avatar could not be deleted.")
        }
      }

      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      if (uploadedAvatarPath) {
        try {
          await deleteAvatar(uploadedAvatarPath)
        } catch {
          // Ignore cleanup failure and return the original save error below.
        }
      }
      setError(err instanceof Error ? err.message : "Failed to save profile.")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const resetDraft = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setDraft({
      display_name: auth.profile?.display_name ?? "",
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
      <Card className="w-lg mx-auto border-border/70 bg-card/85 backdrop-blur">
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle className="text-lg">User profile</CardTitle>
            <Button
              onClick={handleSignOut}
              disabled={isBusy}
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
                    disabled={isBusy}
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
                    disabled={isBusy}
                    className="hidden"
                  />
                </div>
                <span className="text-primary">Choose PNG, JPG, or WebP image up to 5MB.</span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-name">Display name</Label>
                <Input
                  id="profile-name"
                  value={draft.display_name}
                  onChange={(event) => handleDraftChange("display_name", event.target.value)}
                  disabled={isBusy}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-handle">Username</Label>
                <Input
                  id="profile-handle"
                  value={draft.username}
                  onChange={(event) => handleDraftChange("username", event.target.value)}
                  disabled={isBusy}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-status">Email</Label>
                <Textarea
                  id="profile-status"
                  value={draft.email}
                  onChange={(event) => handleDraftChange("email", event.target.value)}
                  rows={3}
                  disabled={isBusy}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isBusy}>
                  {isSavingProfile && <Spinner />}
                  Save profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetDraft}
                  disabled={isBusy}
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
