import { NextResponse } from "next/server"
import { requireApiUser } from "@/app/api/_shared"
import { createCrmRecord, listCrmRecords, type CrmRecord, upsertCrmRecordById } from "@/services/crm-repository"
import { sendZApiAudioMessage, sendZApiTextMessage } from "@/services/zapi"

export async function POST(request: Request) {
  const { response } = await requireApiUser()
  if (response) return response

  const body = await request.json().catch(() => null) as {
    to?: string
    message?: string
    audio?: string
    mimeType?: string
    agentId?: string
    conversationId?: string
    contactName?: string
  } | null
  if (!body?.to || (!body.message && !body.audio)) {
    return NextResponse.json({ error: "Destino e mensagem ou audio sao obrigatorios." }, { status: 400 })
  }

  try {
    const isAudio = Boolean(body.audio)
    const result = isAudio
      ? await sendZApiAudioMessage({ to: body.to, audio: body.audio as string, delayTyping: 1, waveform: true })
      : await sendZApiTextMessage({ to: body.to, message: body.message as string })
    const records = await listCrmRecords("conversas")
    const existingConversation = Array.isArray(records)
      ? (records as CrmRecord[]).find((record) => {
          const phone = String(record.data.phone ?? "")
          return phone.replace(/\D/g, "") === body.to?.replace(/\D/g, "")
        })
      : null

    const conversationId = body.conversationId || existingConversation?.id || `conversation-${body.to.replace(/\D/g, "")}`
    const previousData = existingConversation?.data as Record<string, unknown> | undefined
    const previousMessages = Array.isArray(previousData?.messages) ? previousData.messages : []
    const nextMessage = {
      id: `message-${Date.now()}`,
      direction: "saida",
      kind: isAudio ? "audio" : "texto",
      content: isAudio ? "Audio" : body.message,
      mediaUrl: body.audio,
      mimeType: body.mimeType ?? "audio/webm",
      status: "enviado",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }

    const payload = {
      contactName: body.contactName || String(previousData?.contactName ?? body.to),
      phone: body.to.replace(/\D/g, ""),
      source: "manual",
      unread: 0,
      assignedTo: String(previousData?.assignedTo ?? "Equipe"),
      tags: Array.isArray(previousData?.tags) ? previousData.tags : ["z-api", "manual"],
      lastMessage: isAudio ? "Audio" : body.message,
      updatedAt: "agora",
      messages: [...previousMessages, nextMessage],
      agentId: body.agentId ?? String(previousData?.agentId ?? ""),
      zapi: { lastSendResult: result },
      status: "aberta",
    }

    if (existingConversation || body.conversationId) {
      await upsertCrmRecordById("conversas", conversationId, payload)
    } else {
      await createCrmRecord("conversas", { ...payload, title: payload.contactName })
    }

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao enviar pela Z-API." }, { status: 502 })
  }
}
