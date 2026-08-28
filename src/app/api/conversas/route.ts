import { accepted, ok, requireApiUser } from "@/app/api/_shared"
import { createCrmRecord, deleteCrmRecord, listCrmRecords, updateCrmRecord } from "@/services/crm-repository"

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  return ok(
    await listCrmRecords(
      "conversas",
      user.role === "admin" ? undefined : user.id,
      user.role === "admin" ? undefined : { includeUnowned: true },
    ),
  )
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
  const data = await updateCrmRecord("conversas", body.id, body, user.id)
  return ok(data)
}

export async function DELETE(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({})) as { id?: string }
  if (!body.id) return Response.json({ error: "ID obrigatorio." }, { status: 400 })
  await deleteCrmRecord("conversas", body.id, user.id)
  return ok({ id: body.id })
}
