import { Box, Image, Sparkles, UploadCloud } from "lucide-react"

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

export default function StorageDemo() {
  const isConfigured = supabaseConfig.isConfigured

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-2">
          <Box className="size-3" />
          Storage
        </Badge>
        <Badge variant={isConfigured ? "secondary" : "destructive"}>
          {isConfigured ? "Connected" : "Missing env"}
        </Badge>
        <Badge variant="outline" className="gap-2">
          <Image className="size-3" />
          avatars bucket
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
            <CardTitle className="text-xl">Upload chat avatars</CardTitle>
            <CardDescription>
              The chat app will store profile photos in a Supabase Storage
              bucket.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Empty className="border-dashed">
              <EmptyHeader>
                <EmptyTitle>Storage demo placeholder</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                Add an upload form here that writes to the <code>avatars</code>{" "}
                bucket and returns a public or signed URL.
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Planned flow</CardTitle>
            <CardDescription>
              Keep Storage aligned to the chat identity experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <UploadCloud className="size-3" />
              Upload avatar to <code>avatars</code> bucket.
            </div>
            <div>Write image URL to <code>profiles</code>.</div>
            <div>Render avatars beside chat messages.</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3" />
              Use signed URLs for private buckets.
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
