import "server-only"

import { createCrmRecord, listCrmRecords, type CrmRecord, upsertCrmRecordById } from "@/services/crm-repository"
import { resolveEvolutionPhone, sendEvolutionTextMessage } from "@/services/evolution"
import { normalizePhone } from "@/services/validators"

type SendCrmTextInput = {
  userId: string
  to: string
  message: string
  contactName?: string
  agentId?: string
  conversationId?: string
}

export async function sendCrmTextMessage(input: SendCrmTextInput) {
  const resolvedPhone = await resolveEvolutionPhone(input.to)
  const destinationPhone = resolvedPhone.phone || normalizePhone(input.to)
  const result = await sendEvolutionTextMessage({ to: destinationPhone, message: input.message })
  const records = await listCrmRecords("conversas", input.userId)
  const existingConversation = (records as CrmRecord[]).find((record) => {
    const phone = normalizePhone(String(record.data.phone ?? ""))
    return phone === normalizePhone(input.to) || phone === destinationPhone
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
    assignedTo: String(previousData?.assignedTo ?? "Equipe"),
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

function resolveEvolutionMessageId(result: unknown) {
  if (!result || typeof result !== "object") return undefined
  const payload = result as { key?: { id?: unknown }; message?: { key?: { id?: unknown } }; messageId?: unknown; id?: unknown }
  if (typeof payload.key?.id === "string" && payload.key.id.trim()) return payload.key.id.trim()
  if (typeof payload.message?.key?.id === "string" && payload.message.key.id.trim()) return payload.message.key.id.trim()
  if (typeof payload.messageId === "string" && payload.messageId.trim()) return payload.messageId.trim()
  if (typeof payload.id === "string" && payload.id.trim()) return payload.id.trim()
  return undefined
}
