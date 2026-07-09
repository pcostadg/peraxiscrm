import { NextResponse } from "next/server"
import { createBackendSupabaseClient } from "@/lib/supabase"
import { listCrmRecords, type CrmRecord, upsertCrmRecordById } from "@/services/crm-repository"
import { isValidZApiWebhook, parseZApiWebhookPayload } from "@/services/zapi"

export async function GET() {
  return NextResponse.json({ ok: true, provider: "z-api", status: "webhook ativo" })
}

export async function POST(request: Request) {
  const body = await request.text()
  if (!isValidZApiWebhook(request, body)) {
    return new Response("Invalid webhook token", { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body) as Record<string, unknown>
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const parsed = parseZApiWebhookPayload(payload)
  const supabase = createBackendSupabaseClient()
  if (supabase) {
    await supabase.from("webhook_events").insert({ provider: "z-api", event_type: "whatsapp", payload })
  }

  if (!parsed.phone) {
    return NextResponse.json({ received: true, ignored: true })
  }

  if (parsed.event === "message" && !parsed.message.trim()) {
    return NextResponse.json({ received: true, ignored: true, reason: "empty-message" })
  }

  const records = await listCrmRecords("conversas")
  const existingConversation = Array.isArray(records)
    ? (records as CrmRecord[]).find((record) => {
        const phone = String(record.data.phone ?? "")
        return phone.replace(/\D/g, "") === parsed.phone
      })
    : null

  const previousData = existingConversation?.data as Record<string, unknown> | undefined
  const conversationId = existingConversation?.id || `conversation-${parsed.phone}`

  if (parsed.event === "presence") {
    await upsertCrmRecordById("conversas", conversationId, {
      contactName: String(previousData?.contactName ?? parsed.contactName ?? parsed.phone),
      phone: parsed.phone,
      source: String(previousData?.source ?? "manual"),
      unread: Number(previousData?.unread ?? 0),
      assignedTo: String(previousData?.assignedTo ?? "Equipe"),
      tags: Array.isArray(previousData?.tags) ? previousData.tags : ["z-api"],
      lastMessage: String(previousData?.lastMessage ?? "Conversa iniciada."),
      updatedAt: "agora",
      messages: Array.isArray(previousData?.messages) ? previousData.messages : [],
      presenceStatus: parsed.presenceStatus,
      status: "aberta",
      rawLastWebhook: parsed.raw,
    })

    return NextResponse.json({ received: true, event: "presence" })
  }

  const previousMessages = Array.isArray(previousData?.messages) ? previousData.messages : []
  const nextMessage = {
    id: parsed.messageId,
    direction: parsed.direction,
    kind: parsed.kind,
    content: parsed.message,
    status: parsed.direction === "saida" ? "enviado" : "entregue",
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  }

  await upsertCrmRecordById("conversas", conversationId, {
    contactName: String(previousData?.contactName ?? parsed.contactName ?? parsed.phone),
    phone: parsed.phone,
    source: String(previousData?.source ?? "manual"),
    unread: parsed.direction === "entrada" ? Number(previousData?.unread ?? 0) + 1 : Number(previousData?.unread ?? 0),
    assignedTo: String(previousData?.assignedTo ?? "Equipe"),
    tags: Array.isArray(previousData?.tags) ? previousData.tags : ["z-api"],
    lastMessage: parsed.message,
    updatedAt: "agora",
    messages: [...previousMessages, nextMessage],
    presenceStatus: parsed.direction === "entrada" ? "paused" : previousData?.presenceStatus,
    status: "aberta",
    rawLastWebhook: parsed.raw,
  })

  return NextResponse.json({ received: true })
}
