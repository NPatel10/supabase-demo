import { FlaskConical, ShieldCheck, Sparkles, Zap } from "lucide-react"

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

export default function EdgeFnDemo() {
  const isConfigured = supabaseConfig.isConfigured

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-2">
          <FlaskConical className="size-3" />
          Edge Functions
        </Badge>
        <Badge variant={isConfigured ? "secondary" : "destructive"}>
          {isConfigured ? "Connected" : "Missing env"}
        </Badge>
        <Badge variant="outline" className="gap-2">
          <Zap className="size-3" />
          server-side chat helpers
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
            <CardTitle className="text-xl">Server-side actions</CardTitle>
            <CardDescription>
              Edge Functions can moderate messages, generate signed URLs, or
              enrich chat events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Empty className="border-dashed">
              <EmptyHeader>
                <EmptyTitle>Edge function placeholder</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                Add a function call UI here (e.g. <code>hello-world</code> or a
                message moderation endpoint).
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Why it matters</CardTitle>
            <CardDescription>
              Offload sensitive logic from the client.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-3" />
              Validate chat content before insert.
            </div>
            <div>Generate signed upload URLs for avatars.</div>
            <div>Log analytics without exposing secrets.</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3" />
              Pair with Realtime to broadcast approved messages.
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
