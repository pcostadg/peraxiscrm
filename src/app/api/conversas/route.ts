import { accepted, ok, requireApiUser } from "@/app/api/_shared"
import { limitConversationMessagesRecord, summarizeConversationRecord } from "@/services/conversation-records"
import { createCrmRecord, deleteCrmRecord, getCrmRecordById, listCrmRecords, updateCrmRecord } from "@/services/crm-repository"

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get("id")?.trim()
  const summaryOnly = searchParams.get("summary") === "1"
  const messagesLimit = clampMessagesLimit(searchParams.get("messagesLimit"))

  if (conversationId) {
    const record = await getCrmRecordById("conversas", conversationId)
    if (
      !record ||
      (
        user.role !== "admin" &&
        record.owner_user_id !== user.id &&
        record.owner_user_id !== null
      )
    ) {
      return Response.json({ error: "Conversa nao encontrada." }, { status: 404 })
    }

    return ok(limitConversationMessagesRecord(record, messagesLimit))
  }

  const records = await listCrmRecords(
    "conversas",
    user.role === "admin" ? undefined : user.id,
    user.role === "admin" ? undefined : { includeUnowned: true },
  )

  return ok(records.map((record) => (summaryOnly ? summarizeConversationRecord(record, 0) : limitConversationMessagesRecord(record, messagesLimit))))
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const data = await createCrmRecord("conversas", body, user.id)
  return accepted("Conversa/mensagem salva.", { data })
}

export async function PUT(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({})) as Record<string, unknown> & { id?: string }
  if (!body.id) return Response.json({ error: "ID obrigatorio." }, { status: 400 })
  const current = await getCrmRecordById("conversas", body.id)
  if (
    !current ||
    (
      user.role !== "admin" &&
      current.owner_user_id !== user.id &&
      current.owner_user_id !== null
    )
  ) {
    return Response.json({ error: "Conversa nao encontrada." }, { status: 404 })
  }

  const nextPayload = {
    ...(current.data as Record<string, unknown>),
    ...body,
    messages:
      Object.prototype.hasOwnProperty.call(body, "messages")
        ? body.messages
        : (current.data as Record<string, unknown>).messages,
  }

  const ownerScope = user.role === "admin" || current.owner_user_id === null ? undefined : user.id
  const data = await updateCrmRecord("conversas", body.id, nextPayload, ownerScope)
  return ok(data)
}

export async function DELETE(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({})) as { id?: string }
  if (!body.id) return Response.json({ error: "ID obrigatorio." }, { status: 400 })
  try {
    await deleteCrmRecord("conversas", body.id, user.role === "admin" ? undefined : user.id)
    return ok({ id: body.id })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel excluir a conversa." },
      { status: 400 },
    )
  }
}

function clampMessagesLimit(value: string | null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 40
  return Math.min(200, Math.max(1, Math.trunc(parsed)))
}
