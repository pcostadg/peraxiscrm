import "server-only"

import { createCrmRecord, listCrmRecords, type CrmRecord, upsertCrmRecordById } from "@/services/crm-repository"
import { resolveEvolutionPhone, sendEvolutionMediaMessage, sendEvolutionTextMessage } from "@/services/evolution"
import { normalizePhone, phonesMatch } from "@/services/validators"

type SendCrmTextInput = {
  userId: string
  to: string
  message: string
  contactName?: string
  assignedTo?: string
  agentId?: string
  conversationId?: string
}

type SendCrmMediaInput = {
  userId: string
  to: string
  media: string
  kind: "imagem" | "video" | "documento"
  message?: string
  previewUrl?: string
  mimeType?: string
  fileName?: string
  contactName?: string
  assignedTo?: string
  agentId?: string
  conversationId?: string
}

export async function sendCrmTextMessage(input: SendCrmTextInput) {
  const resolvedPhone = await resolveEvolutionPhone(input.to)
  const destinationPhone = resolvedPhone.phone || normalizePhone(input.to)
  const result = await sendEvolutionTextMessage({ to: destinationPhone, message: input.message })
  const records = await listCrmRecords("conversas", input.userId)
  const existingConversation = (records as CrmRecord[]).find((record) => {
    return phonesMatch(String(record.data.phone ?? ""), input.to) || phonesMatch(String(record.data.phone ?? ""), destinationPhone)
  })

  const conversationId = input.conversationId || existingConversation?.id || `conversation-${destinationPhone}`
  const previousData = existingConversation?.data as Record<string, unknown> | undefined
  const previousMessages = Array.isArray(previousData?.messages) ? previousData.messages : []
  const providerMessageId = resolveEvolutionMessageId(result)
  const nextMessage = {
    id: providerMessageId || `message-${Date.now()}`,
    direction: "saida",
    kind: "texto",
    content: input.message,
    zapiMessageId: providerMessageId,
    status: "enviado",
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  }

  const payload = {
    contactName: input.contactName || String(previousData?.contactName ?? destinationPhone),
    phone: destinationPhone,
    source: "manual",
    unread: 0,
    assignedTo: input.assignedTo || String(previousData?.assignedTo ?? "Equipe"),
    tags: Array.isArray(previousData?.tags) ? previousData.tags : ["evolution", "manual"],
    lastMessage: input.message,
    updatedAt: "agora",
    messages: [...previousMessages, nextMessage],
    agentId: input.agentId ?? String(previousData?.agentId ?? ""),
    evolution: { lastSendResult: result },
    status: "aberta",
  }

  if (existingConversation || input.conversationId) {
    await upsertCrmRecordById("conversas", conversationId, payload, input.userId)
  } else {
    await createCrmRecord("conversas", { ...payload, title: payload.contactName }, input.userId)
  }

  return { result, conversationId, resolvedPhone }
}

export async function sendCrmMediaMessage(input: SendCrmMediaInput) {
  const resolvedPhone = await resolveEvolutionPhone(input.to)
  const destinationPhone = resolvedPhone.phone || normalizePhone(input.to)
  const result = await sendEvolutionMediaMessage({
    to: destinationPhone,
    media: input.media,
    kind: input.kind,
    caption: input.message,
    fileName: input.fileName,
    mimeType: input.mimeType,
  })
  const records = await listCrmRecords("conversas", input.userId)
  const existingConversation = (records as CrmRecord[]).find((record) => {
    return phonesMatch(String(record.data.phone ?? ""), input.to) || phonesMatch(String(record.data.phone ?? ""), destinationPhone)
  })

  const conversationId = input.conversationId || existingConversation?.id || `conversation-${destinationPhone}`
  const previousData = existingConversation?.data as Record<string, unknown> | undefined
  const previousMessages = Array.isArray(previousData?.messages) ? previousData.messages : []
  const providerMessageId = resolveEvolutionMessageId(result)
  const nextMessage = {
    id: providerMessageId || `message-${Date.now()}`,
    direction: "saida",
    kind: input.kind,
    content: input.message || defaultMediaLabel(input.kind),
    mediaUrl: resolvePersistedMediaUrl(input.media),
    previewUrl: resolvePersistedPreviewUrl(input.previewUrl),
    mimeType: input.mimeType,
    fileName: input.fileName,
    zapiMessageId: providerMessageId,
    status: "enviado",
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  }

  const payload = {
    contactName: input.contactName || String(previousData?.contactName ?? destinationPhone),
    phone: destinationPhone,
    source: "manual",
    unread: 0,
    assignedTo: input.assignedTo || String(previousData?.assignedTo ?? "Equipe"),
    tags: Array.isArray(previousData?.tags) ? previousData.tags : ["evolution", "manual"],
    lastMessage: input.message || defaultMediaLabel(input.kind),
    updatedAt: "agora",
    messages: [...previousMessages, nextMessage],
    agentId: input.agentId ?? String(previousData?.agentId ?? ""),
    evolution: { lastSendResult: result },
    status: "aberta",
  }

  if (existingConversation || input.conversationId) {
    await upsertCrmRecordById("conversas", conversationId, payload, input.userId)
  } else {
    await createCrmRecord("conversas", { ...payload, title: payload.contactName }, input.userId)
  }

  return { result, conversationId, resolvedPhone }
}

function defaultMediaLabel(kind: "imagem" | "video" | "documento") {
  switch (kind) {
    case "imagem":
      return "Imagem"
    case "video":
      return "Video"
    case "documento":
      return "Documento"
    default:
      return "Mensagem"
  }
}

function resolvePersistedMediaUrl(value?: string) {
  if (!value) return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  if (normalized.startsWith("data:")) return undefined
  if (normalized.startsWith("blob:")) return undefined
  return normalized
}

function resolvePersistedPreviewUrl(value?: string) {
  if (!value) return undefined
  const normalized = value.trim()
  if (!normalized.startsWith("data:image/")) return undefined
  return normalized
}

function resolveEvolutionMessageId(result: unknown) {
  if (!result || typeof result !== "object") return undefined
  const payload = result as { key?: { id?: unknown }; message?: { key?: { id?: unknown } }; messageId?: unknown; id?: unknown }
  if (typeof payload.key?.id === "string" && payload.key.id.trim()) return payload.key.id.trim()
  if (typeof payload.message?.key?.id === "string" && payload.message.key.id.trim()) return payload.message.key.id.trim()
  if (typeof payload.messageId === "string" && payload.messageId.trim()) return payload.messageId.trim()
  if (typeof payload.id === "string" && payload.id.trim()) return payload.id.trim()
  return undefined
}
