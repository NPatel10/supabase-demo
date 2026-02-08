import { useEffect, useMemo, useState, type SubmitEventHandler } from "react"
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
import type { Message } from "@/types/message"
import { formatProfileHandle, formatTime, formatUsername, getInitials } from "@/screens/utils"
import { getAvatarPublicUrl } from "../03_storage/storageApi"
import { useAuth } from "../02_auth/useAuth"
import { appendMessage, createMessage, isMessageInConversation, listMessages, listRecipients } from "./realtimeApi"

export default function RealtimeDemo() {
  const [draft, setDraft] = useState("")
  const [recipientUserId, setRecipientUserId] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const auth = useAuth()
  const userId = auth.user?.id ?? ""

  const recipientsQuery = useQuery({
    queryKey: ["chat-recipients", userId],
    queryFn: listRecipients,
    staleTime: 1000 * 30,
    enabled: Boolean(auth.user),
  })

  const recipients = useMemo(() => recipientsQuery.data ?? [], [recipientsQuery.data])
  const activeRecipientUserId = useMemo(() => {
    if (recipients.length === 0) return ""

    const recipientExists = recipients.some((profile) => profile.id === recipientUserId)
    return recipientExists ? recipientUserId : recipients[0].id
  }, [recipientUserId, recipients])

  const messagesQueryKey = useMemo(
    () => ["messages", userId, activeRecipientUserId],
    [activeRecipientUserId, userId]
  )
  const messagesQuery = useQuery({
    queryKey: messagesQueryKey,
    queryFn: () => listMessages(userId, activeRecipientUserId),
    staleTime: 1000 * 20,
    enabled: Boolean(auth.user) && Boolean(activeRecipientUserId),
  })

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data])
  const chatMessages = useMemo(() => [...messages].reverse(), [messages])

  const selectedRecipient = recipients.find((profile) => profile.id === activeRecipientUserId)
  const isSelfConversation = Boolean(userId) && activeRecipientUserId === userId

  const selectedRecipientLabel = activeRecipientUserId
    ? isSelfConversation ? "You" : formatUsername(selectedRecipient, activeRecipientUserId)
    : ""
  const selectedRecipientHandle = isSelfConversation
    ? "Message yourself. This is your private space."
    : formatProfileHandle(selectedRecipient)
  const selectedRecipientAvatarUrl = selectedRecipient ? getAvatarPublicUrl(selectedRecipient.avatar_url) : undefined
  const selectedRecipientInitials = selectedRecipient ? getInitials(selectedRecipient.display_name) : ""
  console.log(selectedRecipientInitials)

  useEffect(() => {
    if (!userId || !activeRecipientUserId) return

    const channel = supabase
      .channel(`realtime:messages:${userId}:${activeRecipientUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const incoming = payload.new as Message
          if (isMessageInConversation(incoming, userId, activeRecipientUserId)) {
            queryClient.setQueryData<Message[]>(messagesQueryKey, (current) => appendMessage(current, incoming))
          }
        }
      )

    return () => {
      supabase.removeChannel(channel)
    }
  }, [messagesQueryKey, queryClient, activeRecipientUserId, auth, userId])

  const sendMutation = useMutation({
    mutationFn: createMessage,
    onSuccess: (message) => {
      queryClient.setQueryData<Message[]>(messagesQueryKey, (current) => appendMessage(current, message))
    },
  })

  const handleSubmit: SubmitEventHandler = async (event) => {
    event.preventDefault()

    if (!auth.session || !auth.user) {
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
        sender_user_id: auth.user.id,
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
    (recipientsQuery.error instanceof Error
      ? recipientsQuery.error.message
      : null)

  const isSending = sendMutation.isPending
  const isLoadingConversation = messagesQuery.isLoading || messagesQuery.isFetching
  const isLoadingRecipients = recipientsQuery.isLoading

  return (
    <section className="grid gap-6">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Realtime error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <Card className="border-border/70 bg-card/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Chats</CardTitle>
            <CardDescription>
              Select a user to open conversation history in realtime.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!auth.user ? (
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
              <ScrollArea className="h-128 rounded-xl border border-border/70 bg-muted/30 p-2">
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
                            ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
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
                          <span className="text-primary text-[10px] font-medium uppercase tracking-wide">
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

        <Card className="border-border/70 bg-card/85 backdrop-blur">
          <CardHeader>
            {!auth.user || !activeRecipientUserId ? (
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
                  <AvatarImage
                    src={selectedRecipientAvatarUrl}
                    alt={`${selectedRecipientLabel} avatar`}
                  />
                  <AvatarFallback>{selectedRecipientInitials}</AvatarFallback>
                </Avatar>
                <div className="grid gap-0.5">
                  <CardTitle className="text-xl">{selectedRecipientLabel}</CardTitle>
                  <CardDescription>{selectedRecipientHandle}</CardDescription>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col justify-between gap-4 grow">
            {!auth.user ? (
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
              <ScrollArea className="h-112 rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="grid gap-4">
                  {chatMessages.map((message) => {
                    const isOutgoing = message.sender_user_id === userId
                    const senderLabel = isOutgoing ? "You" : formatUsername(selectedRecipient, message.sender_user_id)

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
                            <span className="font-medium text-foreground">
                              {senderLabel}
                            </span>
                            <span>{formatTime(message.created_at)}</span>
                          </div>
                          <div
                            className={
                              isOutgoing
                                ? "rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                                : "rounded-2xl rounded-bl-sm bg-muted/70 px-3 py-2 text-sm text-foreground"
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

            <form className="grid gap-3 border-t border-border/70 pt-4" onSubmit={handleSubmit}>
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
                  !auth.user ||
                  isSending ||
                  recipients.length === 0 ||
                  !activeRecipientUserId
                }
              />
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={
                    !auth.user ||
                    isSending ||
                    !activeRecipientUserId ||
                    recipients.length === 0
                  }
                >
                  {isSending && <Spinner />}
                  <Send className="size-4" />
                  Send message
                </Button>
                <span>
                  {auth.user
                    ? activeRecipientUserId
                      ? `Signed in as ${auth.user.email ?? "unknown"}, chatting with ${selectedRecipientLabel}.`
                      : `Signed in as ${auth.user.email ?? "unknown"}.`
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
