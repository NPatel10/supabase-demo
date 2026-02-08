import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

type HelloWorldBody = {
  message?: string
  name?: string
}

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405)
  }

  let body: HelloWorldBody = {}

  try {
    body = (await req.json()) as HelloWorldBody
  } catch {
    body = {}
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""

  return json({
    echo: message || "No message provided.",
    function: "hello-world",
    greeting: `Hello${name ? `, ${name}` : ""}!`,
    ok: true,
    received_at: new Date().toISOString(),
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
