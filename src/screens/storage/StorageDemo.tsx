import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Box,
  Image,
  Sparkles,
  UploadCloud,
  Trash2,
  CheckCircle2,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import {
  AVATAR_BUCKET,
  deleteAvatar,
  fetchProfile,
  getAvatarPublicUrl,
  listAvatarFiles,
  upsertProfile,
  uploadAvatar,
} from "./storageApi"
import { supabase } from "@/lib/supabaseClient"
import { buildDraft, formatBytes, formatDate, getInitials, type ProfileDraft } from "./type"

export default function StorageDemo() {
  const [session, setSession] = useState<Session | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletePath, setDeletePath] = useState<string | null>(null)
  const [selectPath, setSelectPath] = useState<string | null>(null)

  const user = session?.user ?? null
  const queryClient = useQueryClient()

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
      setNotice(null)
      setError(null)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })

  const avatarsQuery = useQuery({
    queryKey: ["avatars", user?.id],
    queryFn: () => listAvatarFiles(user!.id),
    enabled: Boolean(user),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })

  const profile = profileQuery.data ?? null
  const [draft, setDraft] = useState<ProfileDraft>(buildDraft(profile, user))

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      draft: ProfileDraft
      file: File | null
    }) => {
      if (!user) {
        throw new Error("Sign in to save your profile.")
      }

      const cleaned = {
        displayName: payload.draft.displayName.trim() || null,
        username: payload.draft.username.trim() || null,
        status: payload.draft.status.trim() || null,
      }

      let avatarPath = profile?.avatar_url ?? null
      if (payload.file) {
        avatarPath = await uploadAvatar(user.id, payload.file)
      }

      return upsertProfile(user.id, {
        displayName: cleaned.displayName,
        username: cleaned.username,
        status: cleaned.status,
        avatarUrl: avatarPath,
      })
    },
    onSuccess: async () => {
      if (!user) {
        return
      }
      setNotice("Profile saved.")
      setSelectedFile(null)
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] })
      await queryClient.invalidateQueries({ queryKey: ["avatars", user.id] })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to save profile.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (path: string) => {
      if (!user) {
        throw new Error("Sign in to manage avatars.")
      }
      await deleteAvatar(path)
      if (profile?.avatar_url === path) {
        await upsertProfile(user.id, { avatarUrl: null })
      }
    },
    onMutate: (path) => setDeletePath(path),
    onSettled: () => setDeletePath(null),
    onSuccess: async () => {
      if (!user) {
        return
      }
      setNotice("Avatar removed.")
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] })
      await queryClient.invalidateQueries({ queryKey: ["avatars", user.id] })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to remove avatar.")
    },
  })

  const selectAvatarMutation = useMutation({
    mutationFn: async (path: string) => {
      if (!user) {
        throw new Error("Sign in to update your profile.")
      }
      await upsertProfile(user.id, { avatarUrl: path })
    },
    onMutate: (path) => setSelectPath(path),
    onSettled: () => setSelectPath(null),
    onSuccess: async () => {
      if (!user) {
        return
      }
      setNotice("Avatar updated.")
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to update avatar.")
    },
  })

  const avatarUrl = useMemo(() => {
    if (previewUrl) {
      return previewUrl
    }
    if (!profile?.avatar_url) {
      return null
    }
    return getAvatarPublicUrl(profile.avatar_url)
  }, [previewUrl, profile])

  const initials = useMemo(() => {
    const base = draft.displayName || user?.email || ""
    return getInitials(base)
  }, [draft.displayName, user?.email])

  const handleDraftChange = (key: keyof ProfileDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setNotice(null)

    const file = event.target.files?.[0] ?? null
    if (!file) {
      setSelectedFile(null)
      setPreviewUrl(null);
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

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => setPreviewUrl(reader.result as string);

    setSelectedFile(file)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    try {
      await saveMutation.mutateAsync({ draft, file: selectedFile })
    } catch {
      // handled in mutation
    }
  }

  const handleReset = () => {
    setError(null)
    setNotice(null)
    setSelectedFile(null)
    setDraft(buildDraft(profile, user))
  }

  const handleRemoveAvatar = async () => {
    if (!profile?.avatar_url) {
      setError("No avatar to remove.")
      return
    }
    const approved = window.confirm("Remove the current avatar?")
    if (!approved) {
      return
    }
    setError(null)
    setNotice(null)
    try {
      await deleteMutation.mutateAsync(profile.avatar_url)
    } catch {
      // handled in mutation
    }
  }

  const avatars = avatarsQuery.data ?? []
  const isLoading = profileQuery.isLoading || avatarsQuery.isLoading
  const isSaving = saveMutation.isPending
  const isDeleting = deleteMutation.isPending
  const hasProfile = Boolean(user)

  const queryError =
    (profileQuery.error instanceof Error ? profileQuery.error.message : null) ??
    (avatarsQuery.error instanceof Error ? avatarsQuery.error.message : null)

  const errorMessage = error ?? queryError

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-2">
          <Box className="size-3" />
          Storage
        </Badge>
        <Badge variant="outline" className="gap-2">
          <Image className="size-3" />
          {AVATAR_BUCKET} bucket
        </Badge>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Storage error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert>
          <AlertTitle>Storage update</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-muted/60 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Profile and avatar</CardTitle>
            <CardDescription>
              Update your chat profile and upload a photo to the
              <code> {AVATAR_BUCKET}</code> bucket.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!hasProfile ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>Sign in to manage your avatar</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Create an account in the Auth demo, then return here to upload
                  a profile photo.
                </EmptyContent>
              </Empty>
            ) : (
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar size="lg" className="size-16">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Profile avatar" />
                    ) : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid gap-1">
                    <div className="text-sm font-medium text-neutral-900">
                      {draft.displayName || user?.email || "Unnamed user"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {profile?.avatar_url
                        ? "Using stored avatar"
                        : "No avatar uploaded yet"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="avatar">Profile image</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSaving}
                  />
                  <div className="text-xs text-muted-foreground">
                    {selectedFile
                      ? `${selectedFile.name} (${formatBytes(selectedFile.size)})`
                      : "PNG, JPG, or WebP up to 5MB."}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    value={draft.displayName}
                    onChange={(event) =>
                      handleDraftChange("displayName", event.target.value)
                    }
                    placeholder="Name shown in chat"
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Handle</Label>
                  <Input
                    id="username"
                    value={draft.username}
                    onChange={(event) =>
                      handleDraftChange("username", event.target.value)
                    }
                    placeholder="Unique handle"
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Textarea
                    id="status"
                    rows={3}
                    value={draft.status}
                    onChange={(event) =>
                      handleDraftChange("status", event.target.value)
                    }
                    placeholder="Shipping the storage demo"
                    disabled={isSaving}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Spinner />}
                    Save profile
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSaving}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemoveAvatar}
                    disabled={isSaving || isDeleting || !profile?.avatar_url}
                  >
                    {isDeleting && <Spinner />}
                    Remove avatar
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Profile created: {formatDate(profile?.created_at)}
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Bucket contents</CardTitle>
            <CardDescription>
              Images are stored under <code>{user?.id ?? "user-id"}/</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Loading uploads...
              </div>
            ) : !hasProfile ? (
              <div className="text-sm text-muted-foreground">
                Sign in to browse stored avatars.
              </div>
            ) : avatars.length === 0 ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>No uploads yet</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Upload an avatar to see it listed in storage.
                </EmptyContent>
              </Empty>
            ) : (
              <div className="grid gap-3">
                {avatars.map((file) => {
                  const path = `${user!.id}/${file.name}`
                  const fileUrl = getAvatarPublicUrl(path)
                  const isCurrent = profile?.avatar_url === path
                  return (
                    <div
                      key={file.name}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-muted/60 bg-white/70 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarImage src={fileUrl} alt={file.name} />
                          <AvatarFallback>IMG</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-0.5">
                          <div className="text-sm font-medium text-neutral-900">
                            {file.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatBytes(file.metadata?.size)}
                            {file.updated_at || file.created_at
                              ? ` - ${formatDate(
                                  file.updated_at ?? file.created_at
                                )}`
                              : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="size-3" />
                            Current
                          </Badge>
                        )}
                        {!isCurrent && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void selectAvatarMutation.mutateAsync(path)
                            }
                            disabled={selectPath === path}
                          >
                            {selectPath === path && <Spinner />}
                            Use
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void deleteMutation.mutateAsync(path)}
                          disabled={deletePath === path}
                        >
                          {deletePath === path && <Spinner />}
                          <Trash2 className="size-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/60 bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Storage notes</CardTitle>
          <CardDescription>
            This demo stores profile photos in Supabase Storage and references
            them from <code>profiles.avatar_url</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <UploadCloud className="size-3" />
            Uploads are grouped by user ID for easy cleanup.
          </div>
          <div>
            Update profile details and avatar in one save action (powered by
            TanStack Query).
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3" />
            Swap to signed URLs if you make the bucket private.
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
