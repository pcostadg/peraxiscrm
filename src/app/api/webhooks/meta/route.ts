import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")

  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 })
  }
  return new Response("Forbidden", { status: 403 })
}

export async function POST(request: Request) {
  const secret = process.env.META_APP_SECRET
  const signature = request.headers.get("x-hub-signature-256")
  const body = await request.text()

  if (!secret || !signature || !isValidSignature(body, signature, secret)) {
    return new Response("Invalid signature", { status: 401 })
  }

  let payload: unknown
  try { payload = JSON.parse(body) } catch { return new Response("Invalid JSON", { status: 400 }) }

  const supabase = createAdminClient()
  const { error } = await supabase.from("webhook_events").insert({ provider: "meta", event_type: "whatsapp", payload })
  if (error) return NextResponse.json({ error: "Could not persist event" }, { status: 500 })
  return NextResponse.json({ received: true })
}

function isValidSignature(body: string, signature: string, secret: string) {
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
  const receivedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}
