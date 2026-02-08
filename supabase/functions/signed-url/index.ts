import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

type SignedUrlBody = {
  bucket?: string
  expiresIn?: number
  path?: string
}

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
}

const maxDownloadExpirySeconds = 3600

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY." }, 500)
  }

  const authorization = req.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Missing Authorization bearer token." }, 401)
  }

  let body: SignedUrlBody
  try {
    body = (await req.json()) as SignedUrlBody
  } catch {
    return json({ error: "Invalid JSON body." }, 400)
  }

  const bucket = typeof body.bucket === "string" ? body.bucket.trim() : ""
  if (!bucket) {
    return json({ error: "bucket is required." }, 400)
  }

  const path =
    typeof body.path === "string" ? body.path.trim().replace(/^\/+/, "") : ""
  if (!path) {
    return json({ error: "path is required." }, 400)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return json({ error: "Invalid user session." }, 401)
  }

  const userPrefix = `${user.id}/`
  if (!path.startsWith(userPrefix)) {
    return json(
      {
        error: `path must start with "${userPrefix}" to keep objects user-scoped.`,
      },
      403
    )
  }

  const expiresIn = Number(body.expiresIn ?? 120)
  if (
    !Number.isInteger(expiresIn) ||
    expiresIn < 1 ||
    expiresIn > maxDownloadExpirySeconds
  ) {
    return json(
      {
        error: `expiresIn must be an integer between 1 and ${maxDownloadExpirySeconds}.`,
      },
      400
    )
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error || !data) {
    return json({ error: error?.message ?? "Failed to create signed URL." }, 400)
  }

  return json({
    bucket,
    expiresIn,
    ok: true,
    path,
    signedUrl: data.signedUrl,
  })
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  })
}
