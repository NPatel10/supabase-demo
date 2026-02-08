import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Send } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import type { Message, MessageInsert } from "@/types/message"
import { formatTime, formatUsername, getInitials } from "@/screens/utils"
import type { Profile } from "@/types/profile"
import { getAvatarPublicUrl } from "../03_storage/storageApi"

const MESSAGE_LIMIT = 50

function formatProfileHandle(profile: Profile | undefined) {
  const username = profile?.username?.trim() ?? ""
  return username ? `@${username}` : "No username"
}

function isMessageInConversation(
  message: Message,
  currentUserId: string,
  recipientUserId: string
) {
  const sentByCurrentUser =
    message.sender_user_id === currentUserId &&
    message.receiver_user_id === recipientUserId
  const receivedByCurrentUser =
    message.sender_user_id === recipientUserId &&
    message.receiver_user_id === currentUserId

  return sentByCurrentUser || receivedByCurrentUser
}

async function listMessages(
  currentUserId: string,
  recipientUserId: string
): Promise<Message[]> {
  const conversationFilter =
    `and(sender_user_id.eq.${currentUserId},receiver_user_id.eq.${recipientUserId}),` +
    `and(sender_user_id.eq.${recipientUserId},receiver_user_id.eq.${currentUserId})`

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_user_id, receiver_user_id, body, created_at")
    .or(conversationFilter)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_LIMIT)

  if (error) {
    throw error
  }

  return (data ?? []) as Message[]
}

async function listProfiles(userIds: string[]): Promise<Profile[]> {
  if (userIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, created_at")
    .in("id", userIds)

  if (error) {
    throw error
  }

  return (data ?? []) as Profile[]
}

async function listRecipients(currentUserId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, created_at")
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  const profiles = (data ?? []) as Profile[]
  return profiles.sort((a, b) => {
    if (a.id === currentUserId) {
      return -1
    }
    if (b.id === currentUserId) {
      return 1
    }
    return 0
  })
}

async function createMessage(payload: MessageInsert): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("id, sender_user_id, receiver_user_id, body, created_at")
    .single()

  if (error) {
    throw error
  }

  return data as Message
}

export default function RealtimeDemo() {
  const isConfigured = true
  const [session, setSession] = useState<Session | null>(null)
  const [draft, setDraft] = useState("")
  const [recipientUserId, setRecipientUserId] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

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
      setFormError(null)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? ""

  const recipientsQuery = useQuery({
    queryKey: ["chat-recipients", userId],
    queryFn: () => {
      if (!userId) {
        return Promise.resolve([])
      }
      return listRecipients(userId)
    },
    staleTime: 1000 * 30,
    enabled: isConfigured && Boolean(session),
  })

  const recipients = useMemo(() => recipientsQuery.data ?? [], [recipientsQuery.data])

  const activeRecipientUserId = useMemo(() => {
    if (recipients.length === 0) {
      return ""
    }

    const recipientExists = recipients.some(
      (profile) => profile.id === recipientUserId
    )

    return recipientExists ? recipientUserId : recipients[0].id
  }, [recipientUserId, recipients])

  const messagesQueryKey = useMemo(
    () => ["messages", userId, activeRecipientUserId],
    [activeRecipientUserId, userId]
  )

  const messagesQuery = useQuery({
    queryKey: messagesQueryKey,
    queryFn: () => {
      if (!userId || !activeRecipientUserId) {
        return Promise.resolve([])
      }

      return listMessages(userId, activeRecipientUserId)
    },
    staleTime: 1000 * 20,
    enabled:
      isConfigured &&
      Boolean(session) &&
      Boolean(userId) &&
      Boolean(activeRecipientUserId),
  })

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data])

  const chatMessages = useMemo(() => {
    return [...messages].reverse()
  }, [messages])

  const messageUserIds = useMemo(() => {
    const ids = new Set<string>()

    if (userId) {
      ids.add(userId)
    }

    if (activeRecipientUserId) {
      ids.add(activeRecipientUserId)
    }

    messages.forEach((message) => {
      ids.add(message.sender_user_id)
      ids.add(message.receiver_user_id)
    })

    return Array.from(ids).sort()
  }, [activeRecipientUserId, messages, userId])

  const profilesQuery = useQuery({
    queryKey: ["profiles", messageUserIds],
    queryFn: () => listProfiles(messageUserIds),
    enabled: isConfigured && Boolean(session) && messageUserIds.length > 0,
  })

  const profilesById = useMemo(() => {
    return new Map(
      (profilesQuery.data ?? []).map((profile) => [profile.id, profile])
    )
  }, [profilesQuery.data])

  const selectedRecipient =
    recipients.find((profile) => profile.id === activeRecipientUserId) ??
    profilesById.get(activeRecipientUserId)
  const isSelfConversation = Boolean(userId) && activeRecipientUserId === userId

  const selectedRecipientLabel = activeRecipientUserId
    ? isSelfConversation
      ? "You"
      : formatUsername(selectedRecipient, activeRecipientUserId)
    : ""
  const selectedRecipientHandle = isSelfConversation
    ? "Message yourself"
    : formatProfileHandle(selectedRecipient)
  const selectedRecipientAvatarUrl = getAvatarPublicUrl(selectedRecipient?.avatar_url ?? "")
  const selectedRecipientInitials = getInitials(
    selectedRecipientLabel || selectedRecipientHandle
  )

  useEffect(() => {
    if (!isConfigured || !session || !userId || !activeRecipientUserId) {
      return
    }

    const channel = supabase
      .channel(`realtime:messages:${userId}:${activeRecipientUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const incoming = payload.new as Message
          if (!isMessageInConversation(incoming, userId, activeRecipientUserId)) {
            return
          }

          queryClient.setQueryData<Message[]>(messagesQueryKey, (current) => {
            const existing = current ?? []
            if (existing.some((message) => message.id === incoming.id)) {
              return existing
            }
            return [incoming, ...existing].slice(0, MESSAGE_LIMIT)
          })
        }
      )

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    isConfigured,
    messagesQueryKey,
    queryClient,
    activeRecipientUserId,
    session,
    userId,
  ])

  const sendMutation = useMutation({
    mutationFn: createMessage,
    onSuccess: (message) => {
      queryClient.setQueryData<Message[]>(messagesQueryKey, (current) => {
        const existing = current ?? []
        if (existing.some((item) => item.id === message.id)) {
          return existing
        }
        return [message, ...existing].slice(0, MESSAGE_LIMIT)
      })
    },
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!session?.user) {
      setFormError("Sign in to send a message.")
      return
    }

    if (!activeRecipientUserId) {
      setFormError("Select a recipient before sending.")
      return
    }

    const trimmed = draft.trim()
    if (!trimmed) {
      setFormError("Message body is required.")
      return
    }

    setFormError(null)
    try {
      await sendMutation.mutateAsync({
        sender_user_id: session.user.id,
        receiver_user_id: activeRecipientUserId,
        body: trimmed,
      })
      setDraft("")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to send message.")
    }
  }

  const errorMessage =
    formError ??
    (sendMutation.error instanceof Error ? sendMutation.error.message : null) ??
    (messagesQuery.error instanceof Error
      ? messagesQuery.error.message
      : null) ??
    (profilesQuery.error instanceof Error
      ? profilesQuery.error.message
      : null) ??
    (recipientsQuery.error instanceof Error
      ? recipientsQuery.error.message
      : null)

  const isSending = sendMutation.isPending
  const isLoadingConversation = messagesQuery.isLoading || messagesQuery.isFetching
  const isLoadingRecipients = recipientsQuery.isLoading
  const user = session?.user ?? null

  return (
    <section className="grid gap-6">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Realtime error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <Card className="border-muted/60 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Chats</CardTitle>
            <CardDescription>
              Select a user to open conversation history in realtime.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!user ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>Sign in to view users</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Use the Auth screen to sign in, then choose a user to start
                  chatting.
                </EmptyContent>
              </Empty>
            ) : isLoadingRecipients ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Loading chat users...
              </div>
            ) : recipients.length === 0 ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>No recipients available</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Create another account to make it appear in the chat list.
                </EmptyContent>
              </Empty>
            ) : (
              <ScrollArea className="h-128 rounded-xl border border-muted/60 bg-white/60 p-2">
                <div className="grid gap-1">
                  {recipients.map((profile) => {
                    const isSelfProfile = profile.id === userId
                    const isActive = profile.id === activeRecipientUserId
                    const profileLabel = isSelfProfile
                      ? "You"
                      : formatUsername(profile, profile.id)
                    const profileHandle = isSelfProfile
                      ? "Message yourself"
                      : formatProfileHandle(profile)
                    const avatarUrl = getAvatarPublicUrl(profile.avatar_url)
                    const profileInitials = getInitials(profileLabel)

                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => {
                          setRecipientUserId(profile.id)
                          setFormError(null)
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition",
                          isActive
                            ? "bg-emerald-100/80 text-emerald-950"
                            : "hover:bg-muted/60"
                        )}
                      >
                        <Avatar size="sm">
                          {avatarUrl ? (
                            <AvatarImage
                              src={avatarUrl}
                              alt={`${profileLabel} avatar`}
                            />
                          ) : null}
                          <AvatarFallback>{profileInitials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {profileLabel}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {profileHandle}
                          </div>
                        </div>
                        {isActive && (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                            {isSelfProfile ? "Self" : "Active"}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-white/80 backdrop-blur">
          <CardHeader>
            {!user || !activeRecipientUserId ? (
              <>
                <CardTitle className="text-xl">Live chat feed</CardTitle>
                <CardDescription>
                  This screen subscribes to <code>messages</code> with
                  <code> postgres_changes</code> and updates selected
                  conversations instantly.
                </CardDescription>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar>
                  {selectedRecipientAvatarUrl ? (
                    <AvatarImage
                      src={selectedRecipientAvatarUrl}
                      alt={`${selectedRecipientLabel} avatar`}
                    />
                  ) : null}
                  <AvatarFallback>{selectedRecipientInitials}</AvatarFallback>
                </Avatar>
                <div className="grid gap-0.5">
                  <CardTitle className="text-xl">{selectedRecipientLabel}</CardTitle>
                  <CardDescription>{selectedRecipientHandle}</CardDescription>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            {!user ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>Sign in to view messages</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Use the Auth screen to create a user, then come back to chat
                  in realtime.
                </EmptyContent>
              </Empty>
            ) : recipients.length === 0 ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>No recipients available</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Create and sign in with another user in a second tab to start
                  a conversation.
                </EmptyContent>
              </Empty>
            ) : !activeRecipientUserId ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>Select a user</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Choose a user from the left panel to load chat history.
                </EmptyContent>
              </Empty>
            ) : isLoadingConversation ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Loading messages...
              </div>
            ) : chatMessages.length === 0 ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>No messages yet</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  Send the first message and open another account to see replies
                  stream in realtime.
                </EmptyContent>
              </Empty>
            ) : (
              <ScrollArea className="h-112 rounded-xl border border-muted/60 bg-white/60 p-4">
                <div className="grid gap-4">
                  {chatMessages.map((message) => {
                    const isOutgoing = message.sender_user_id === userId
                    const sender = profilesById.get(message.sender_user_id)
                    const senderLabel = isOutgoing
                      ? "You"
                      : formatUsername(sender, message.sender_user_id)

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
                      >
                        <div className="grid max-w-[85%] gap-1">
                          <div
                            className={`flex items-center gap-2 text-xs text-muted-foreground ${
                              isOutgoing ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span className="font-medium text-neutral-900">
                              {senderLabel}
                            </span>
                            <span>{formatTime(message.created_at)}</span>
                          </div>
                          <div
                            className={
                              isOutgoing
                                ? "rounded-2xl rounded-br-sm bg-emerald-100 px-3 py-2 text-sm text-emerald-900"
                                : "rounded-2xl rounded-bl-sm bg-muted/70 px-3 py-2 text-sm text-neutral-800"
                            }
                          >
                            {message.body}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}

            <form className="grid gap-3 border-t border-muted/60 pt-4" onSubmit={handleSubmit}>
              <Textarea
                id="chat-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  activeRecipientUserId
                    ? `Message ${selectedRecipientLabel || "user"}`
                    : "Select a user from the left panel"
                }
                rows={3}
                disabled={
                  !user ||
                  isSending ||
                  !isConfigured ||
                  recipients.length === 0 ||
                  !activeRecipientUserId
                }
              />
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={
                    !user ||
                    isSending ||
                    !isConfigured ||
                    !activeRecipientUserId ||
                    recipients.length === 0
                  }
                >
                  {isSending && <Spinner />}
                  <Send className="size-4" />
                  Send message
                </Button>
                <span>
                  {user
                    ? activeRecipientUserId
                      ? `Signed in as ${user.email ?? "unknown"}, chatting with ${selectedRecipientLabel}.`
                      : `Signed in as ${user.email ?? "unknown"}.`
                    : "Sign in to send messages."}
                </span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
