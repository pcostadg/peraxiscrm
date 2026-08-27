import { NextResponse } from "next/server"
import { createBackendSupabaseClient } from "@/lib/supabase"
import { findDefaultCrmOwnerId, listCrmRecords, type CrmRecord, upsertCrmRecordById } from "@/services/crm-repository"
import { extractEvolutionStatusUpdates, isEvolutionStatusWebhook, isValidEvolutionWebhook, parseEvolutionWebhookPayload } from "@/services/evolution"

function isPlaceholderName(value: unknown, phone: string) {
  const name = String(value ?? "").trim().toLowerCase()
  const normalizedPhone = phone.replace(/\D/g, "")
  return !name || name === "contato evolution" || name === normalizedPhone || name === `+${normalizedPhone}`
}

function resolveStoredContactName(previousData: Record<string, unknown> | undefined, parsedName: string, phone: string) {
  const previousName = String(previousData?.contactName ?? "").trim()
  if (previousName && !isPlaceholderName(previousName, phone)) return previousName
  if (parsedName && !isPlaceholderName(parsedName, phone)) return parsedName
  return previousName || parsedName || phone
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "evolution", status: "webhook ativo" })
}

export async function POST(request: Request) {
  const body = await request.text()
  if (!isValidEvolutionWebhook(request, body)) {
    return new Response("Invalid webhook token", { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body) as Record<string, unknown>
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const parsed = parseEvolutionWebhookPayload(payload)
  const supabase = createBackendSupabaseClient()
  if (supabase) {
    await supabase.from("webhook_events").insert({ provider: "evolution", event_type: String(payload.event ?? "whatsapp"), payload })
  }

  if (!parsed.phone) {
    return NextResponse.json({ received: true, ignored: true })
  }

  if (parsed.event === "message" && parsed.kind === "texto" && !parsed.message.trim() && !parsed.mediaUrl) {
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
  const ownerUserId = existingConversation?.owner_user_id ?? await findDefaultCrmOwnerId()

  if (isEvolutionStatusWebhook(payload)) {
    if (!existingConversation) {
      return NextResponse.json({ received: true, ignored: true, reason: "conversation-not-found" })
    }

    const previousMessages = Array.isArray(previousData?.messages) ? previousData.messages : []
    const nextMessages = applyEvolutionStatusUpdates(previousMessages, payload)

    await upsertCrmRecordById("conversas", conversationId, {
      contactName: resolveStoredContactName(previousData, parsed.contactName, parsed.phone),
      phone: parsed.phone,
      source: String(previousData?.source ?? "manual"),
      unread: Number(previousData?.unread ?? 0),
      assignedTo: String(previousData?.assignedTo ?? "Equipe"),
      tags: Array.isArray(previousData?.tags) ? previousData.tags : ["evolution"],
      lastMessage: String(previousData?.lastMessage ?? "Conversa iniciada."),
      updatedAt: "agora",
      messages: nextMessages,
      presenceStatus: previousData?.presenceStatus,
      status: "aberta",
      rawLastWebhook: payload,
    }, ownerUserId ?? undefined)

    return NextResponse.json({ received: true, event: "messages.update" })
  }

  if (parsed.event === "presence") {
    await upsertCrmRecordById("conversas", conversationId, {
      contactName: resolveStoredContactName(previousData, parsed.contactName, parsed.phone),
      phone: parsed.phone,
      source: String(previousData?.source ?? "manual"),
      unread: Number(previousData?.unread ?? 0),
      assignedTo: String(previousData?.assignedTo ?? "Equipe"),
      tags: Array.isArray(previousData?.tags) ? previousData.tags : ["evolution"],
      lastMessage: String(previousData?.lastMessage ?? "Conversa iniciada."),
      updatedAt: "agora",
      messages: Array.isArray(previousData?.messages) ? previousData.messages : [],
      presenceStatus: parsed.presenceStatus,
      status: "aberta",
      rawLastWebhook: parsed.raw,
    }, ownerUserId ?? undefined)

    return NextResponse.json({ received: true, event: "presence" })
  }

  const messagePreview = getMessagePreview(parsed)
  const previousMessages = Array.isArray(previousData?.messages) ? previousData.messages : []
  const nextMessage = {
    id: parsed.messageId,
    direction: parsed.direction,
    kind: parsed.kind,
    content: messagePreview,
    mediaUrl: parsed.mediaUrl,
    mimeType: parsed.mimeType,
    fileName: parsed.fileName,
    zapiMessageId: parsed.messageId,
    status: parsed.direction === "saida" ? "enviado" : "entregue",
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  }

  await upsertCrmRecordById("conversas", conversationId, {
    contactName: resolveStoredContactName(previousData, parsed.contactName, parsed.phone),
    phone: parsed.phone,
    source: String(previousData?.source ?? "manual"),
    unread: parsed.direction === "entrada" ? Number(previousData?.unread ?? 0) + 1 : Number(previousData?.unread ?? 0),
    assignedTo: String(previousData?.assignedTo ?? "Equipe"),
    tags: Array.isArray(previousData?.tags) ? previousData.tags : ["evolution"],
    lastMessage: messagePreview,
    updatedAt: "agora",
    messages: appendOrMergeMessage(previousMessages, nextMessage),
    presenceStatus: parsed.direction === "entrada" ? "paused" : previousData?.presenceStatus,
    status: "aberta",
    rawLastWebhook: parsed.raw,
  }, ownerUserId ?? undefined)

  return NextResponse.json({ received: true })
}

function getMessagePreview(parsed: ReturnType<typeof parseEvolutionWebhookPayload>) {
  if (parsed.event !== "message") return ""
  if (parsed.message.trim()) return parsed.message

  switch (parsed.kind) {
    case "audio":
      return "Audio"
    case "imagem":
      return "Imagem"
    case "video":
      return "Video"
    case "documento":
      return parsed.fileName?.trim() || "Documento"
    default:
      return "Mensagem"
  }
}

function applyEvolutionStatusUpdates(messages: unknown[], payload: Record<string, unknown>) {
  const updates = extractEvolutionStatusUpdates(payload)
  if (!updates.length) return messages

  return messages.map((entry) => {
    let nextEntry = entry

    for (const update of updates) {
      nextEntry = updateMessageStatus(nextEntry, {
        messageIds: [update.messageId],
        status: update.status,
        zapiMessageId: update.messageId,
      })
    }

    return nextEntry
  })
}

function updateMessageStatus(
  entry: unknown,
  input: {
    messageIds: string[]
    status: "enviado" | "entregue" | "lido" | "falha"
    zapiMessageId?: string
  },
) {
  if (!entry || typeof entry !== "object") return entry
  const message = entry as Record<string, unknown>
  const knownIds = [
    normalizeCallbackId(message.id),
    normalizeCallbackId(message.zapiMessageId),
  ].filter(Boolean)

  if (!knownIds.some((id) => input.messageIds.includes(id))) {
    return entry
  }

  return {
    ...message,
    status: input.status,
    zapiMessageId: input.zapiMessageId ?? message.zapiMessageId,
  }
}

function normalizeCallbackId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

function appendOrMergeMessage(messages: unknown[], nextMessage: Record<string, unknown>) {
  const nextId = normalizeCallbackId(nextMessage.id)
  if (!nextId) return [...messages, nextMessage]

  const existingIndex = messages.findIndex((entry) => {
    if (!entry || typeof entry !== "object") return false
    const message = entry as Record<string, unknown>
    return (
      normalizeCallbackId(message.id) === nextId ||
      normalizeCallbackId(message.zapiMessageId) === nextId
    )
  })

  if (existingIndex === -1) {
    return [...messages, nextMessage]
  }

  return messages.map((entry, index) => {
    if (index !== existingIndex || !entry || typeof entry !== "object") return entry
    return {
      ...(entry as Record<string, unknown>),
      ...nextMessage,
    }
  })
}
