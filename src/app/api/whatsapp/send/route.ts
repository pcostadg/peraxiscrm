import { NextResponse } from "next/server"
import { requireApiUser } from "@/app/api/_shared"
import { createCrmRecord, listCrmRecords, type CrmRecord, upsertCrmRecordById } from "@/services/crm-repository"
import { sendZApiTextMessage } from "@/services/zapi"

export async function POST(request: Request) {
  const { response } = await requireApiUser()
  if (response) return response

  const body = await request.json().catch(() => null) as { to?: string; message?: string; agentId?: string; conversationId?: string; contactName?: string } | null
  if (!body?.to || !body.message) return NextResponse.json({ error: "Destino e mensagem sao obrigatorios." }, { status: 400 })

  try {
    const result = await sendZApiTextMessage({ to: body.to, message: body.message })
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
      kind: "texto",
      content: body.message,
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
      lastMessage: body.message,
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
