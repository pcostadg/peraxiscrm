import { NextResponse } from "next/server"
import { requireApiUser } from "@/app/api/_shared"
import { createCrmRecord, listCrmRecords, type CrmRecord, upsertCrmRecordById } from "@/services/crm-repository"
import { sendCrmTextMessage } from "@/services/crm-whatsapp"
import { resolveEvolutionPhone, sendEvolutionAudioMessage, sendEvolutionMediaMessage } from "@/services/evolution"
import { normalizePhone, phonesMatch } from "@/services/validators"

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response

  const body = await request.json().catch(() => null) as {
    to?: string
    message?: string
    audio?: string
    media?: string
    previewUrl?: string
    kind?: "imagem" | "video" | "documento"
    mimeType?: string
    fileName?: string
    agentId?: string
    conversationId?: string
    contactName?: string
  } | null
  if (!body?.to || (!body.message && !body.audio && !body.media)) {
    return NextResponse.json({ error: "Destino e mensagem, audio ou anexo sao obrigatorios." }, { status: 400 })
  }

  try {
    const resolvedPhone = await resolveEvolutionPhone(body.to)
    const destinationPhone = resolvedPhone.phone || normalizePhone(body.to)
    const isAudio = Boolean(body.audio)
    const isMedia = Boolean(body.media && body.kind)
    const result = isAudio
      ? await sendEvolutionAudioMessage({
          to: destinationPhone,
          audio: body.audio as string,
          delayTyping: 1,
          mimeType: body.mimeType,
        })
      : isMedia
        ? await sendEvolutionMediaMessage({
            to: destinationPhone,
            media: body.media as string,
            kind: body.kind as "imagem" | "video" | "documento",
            caption: body.message,
            fileName: body.fileName,
            mimeType: body.mimeType,
          })
      : (await sendCrmTextMessage({
          userId: user.id,
          to: destinationPhone,
          message: body.message as string,
          contactName: body.contactName,
          agentId: body.agentId,
          conversationId: body.conversationId,
        })).result

    if (!isAudio && !isMedia) {
      return NextResponse.json({ ok: true, result })
    }

    const records = await listCrmRecords("conversas", user.id)
    const existingConversation = (records as CrmRecord[]).find((record) => {
      return phonesMatch(String(record.data.phone ?? ""), body.to ?? "") || phonesMatch(String(record.data.phone ?? ""), destinationPhone)
    })

    const conversationId = body.conversationId || existingConversation?.id || `conversation-${destinationPhone}`
    const previousData = existingConversation?.data as Record<string, unknown> | undefined
    const previousMessages = Array.isArray(previousData?.messages) ? previousData.messages : []
    const persistedMediaUrl = resolvePersistedMediaUrl(isAudio ? body.audio : body.media)
    const providerMessageId = resolveEvolutionMessageId(result)
    const nextMessage = {
      id: providerMessageId || `message-${Date.now()}`,
      direction: "saida",
      kind: isAudio ? "audio" : (body.kind ?? "texto"),
      content: isAudio ? "Audio" : (body.message || defaultMediaLabel(body.kind)),
      mediaUrl: persistedMediaUrl,
      previewUrl: resolvePersistedPreviewUrl(body.previewUrl),
      mimeType: body.mimeType ?? (isAudio ? "audio/webm" : undefined),
      fileName: body.fileName,
      zapiMessageId: providerMessageId,
      status: "enviado",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }

    const payload = {
      contactName: body.contactName || String(previousData?.contactName ?? destinationPhone),
      phone: destinationPhone,
      source: "manual",
      unread: 0,
      assignedTo: String(previousData?.assignedTo ?? "Equipe"),
      tags: Array.isArray(previousData?.tags) ? previousData.tags : ["evolution", "manual"],
      lastMessage: isAudio ? "Audio" : (body.message || defaultMediaLabel(body.kind)),
      updatedAt: "agora",
      messages: [...previousMessages, nextMessage],
      agentId: body.agentId ?? String(previousData?.agentId ?? ""),
      evolution: { lastSendResult: result, resolvedPhone },
      status: "aberta",
    }

    if (existingConversation || body.conversationId) {
      await upsertCrmRecordById("conversas", conversationId, payload, user.id)
    } else {
      await createCrmRecord("conversas", { ...payload, title: payload.contactName }, user.id)
    }

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao enviar pela Evolution API." }, { status: 502 })
  }
}

function defaultMediaLabel(kind?: "imagem" | "video" | "documento") {
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
