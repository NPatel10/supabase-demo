import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MessageCircle, Radio, Send, ShieldCheck, Sparkles } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabaseClient"
import type { Message, MessageInsert } from "@/types/message"
import type { Profile } from "./utils"

const MESSAGE_LIMIT = 50

function formatMessageTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "unknown"
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

function formatMessageDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "unknown"
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed)
}

function formatProfileLabel(profile: Profile | undefined, fallbackUserId: string) {
  const displayName = profile?.display_name?.trim() ?? ""
  if (displayName) {
    return displayName
  }

  const username = profile?.username?.trim() ?? ""
  if (username) {
    return username
  }

  return `User ${fallbackUserId.slice(0, 6)}`
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
    .neq("id", currentUserId)
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as Profile[]
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
  const [channelState, setChannelState] = useState("IDLE")

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

  const selectedRecipientLabel = activeRecipientUserId
    ? formatProfileLabel(selectedRecipient, activeRecipientUserId)
    : ""

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
      .subscribe((status) => {
        setChannelState(status)
      })

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
      if (!(err instanceof Error)) {
        setFormError("Failed to send message.")
      }
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
  const isLoadingConversation = messagesQuery.isLoading
  const isLoadingRecipients = recipientsQuery.isLoading
  const isLive = channelState === "SUBSCRIBED"
  const user = session?.user ?? null

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-2">
          <Radio className="size-3" />
          Realtime Chat
        </Badge>
        <Badge variant={isConfigured ? "secondary" : "destructive"}>
          {isConfigured ? "Connected" : "Missing env"}
        </Badge>
        <Badge variant={isLive ? "secondary" : "outline"}>
          {isLive ? "Realtime live" : "Realtime idle"}
        </Badge>
        <Badge variant="outline" className="gap-2">
          <MessageCircle className="size-3" />
          messages table
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

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Realtime error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-muted/60 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Live chat feed</CardTitle>
            <CardDescription>
              This screen subscribes to <code>messages</code> with
              <code>postgres_changes</code> and renders both incoming and
              outgoing messages for the selected conversation.
            </CardDescription>
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
                  Create and sign in with another user in a second tab to start
                  a conversation.
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
              <ScrollArea className="h-80 rounded-xl border border-muted/60 bg-white/60 p-4">
                <div className="grid gap-4">
                  {chatMessages.map((message) => {
                    const isOutgoing = message.sender_user_id === userId
                    const sender = profilesById.get(message.sender_user_id)
                    const receiver = profilesById.get(message.receiver_user_id)
                    const senderLabel = isOutgoing
                      ? "You"
                      : formatProfileLabel(sender, message.sender_user_id)
                    const receiverLabel =
                      message.receiver_user_id === userId
                        ? "you"
                        : formatProfileLabel(receiver, message.receiver_user_id)

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
                            <span>to {receiverLabel}</span>
                            <span>{formatMessageTime(message.created_at)}</span>
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

            <form className="grid gap-3" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="chat-recipient">Chat with</Label>
                <NativeSelect
                  id="chat-recipient"
                  value={activeRecipientUserId}
                  onChange={(event) => setRecipientUserId(event.target.value)}
                  disabled={
                    !user || recipients.length === 0 || isSending || !isConfigured
                  }
                  className="w-full"
                >
                  {recipients.length === 0 ? (
                    <NativeSelectOption value="">
                      No recipients available
                    </NativeSelectOption>
                  ) : (
                    recipients.map((profile) => {
                      const label = formatProfileLabel(profile, profile.id)
                      const handle = profile.username
                        ? ` (@${profile.username})`
                        : ""

                      return (
                        <NativeSelectOption key={profile.id} value={profile.id}>
                          {`${label}${handle}`}
                        </NativeSelectOption>
                      )
                    })
                  )}
                </NativeSelect>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="chat-message">Send a message</Label>
                <Textarea
                  id="chat-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type your message"
                  rows={3}
                  disabled={
                    !user ||
                    isSending ||
                    !isConfigured ||
                    recipients.length === 0 ||
                    !activeRecipientUserId
                  }
                />
              </div>
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

        <div className="grid gap-4">
          <Card className="border-muted/60 bg-white/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Chat identity</CardTitle>
              <CardDescription>
                Auth + Profiles provide display names for each participant.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-neutral-900">profiles</span>{" "}
                supplies <code>display_name</code> and <code>username</code>.
              </div>
              <div>
                <span className="font-medium text-neutral-900">messages</span>{" "}
                stores <code>sender_user_id</code> and
                <code>receiver_user_id</code> for direction.
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-3" />
                RLS should enforce sender ownership on inserts.
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 bg-white/75 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Realtime status</CardTitle>
              <CardDescription>
                Keep this tab open while sending messages in another window.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div>
                Channel state:{" "}
                <span className="font-medium text-neutral-900">
                  {channelState.toLowerCase()}
                </span>
              </div>
              <div>
                Latest message date:{" "}
                <span className="font-medium text-neutral-900">
                  {!user
                    ? "sign in to load"
                    : !activeRecipientUserId
                      ? "select recipient"
                      : messages[0]
                        ? formatMessageDate(messages[0].created_at)
                        : "none"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="size-3" />
                Open a second tab with another user to verify two-way realtime
                chat.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
