import { MessageCircle, Radio, ShieldCheck, Sparkles } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { supabaseConfig } from "@/lib/supabaseClient"

export default function RealtimeDemo() {
  const isConfigured = supabaseConfig.isConfigured

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

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-muted/60 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Live chat feed</CardTitle>
            <CardDescription>
              This screen will subscribe to <code>messages</code> via
              <code>postgres_changes</code> and stream updates across tabs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Empty className="border-dashed">
              <EmptyHeader>
                <EmptyTitle>Realtime stream placeholder</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                Next step: wire a subscription to the <code>messages</code> table
                and render new rows as they arrive.
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Chat identity</CardTitle>
            <CardDescription>
              Auth + Profiles provide display names for every message.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-neutral-900">profiles</span>{" "}
              supplies <code>display_name</code> and <code>username</code>.
            </div>
            <div>
              <span className="font-medium text-neutral-900">messages</span>{" "}
              links to <code>user_id</code> for attribution.
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3" />
              RLS ensures users only send their own messages.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/60 bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Next build steps</CardTitle>
          <CardDescription>
            Keep the Realtime demo aligned with the Auth flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <div>1. Load recent messages ordered by <code>created_at</code>.</div>
          <div>2. Subscribe to inserts on <code>messages</code>.</div>
          <div>3. Render author metadata from <code>profiles</code>.</div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-3" />
            Open a second tab to prove realtime delivery.
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
