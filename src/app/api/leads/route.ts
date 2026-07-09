import { accepted, ok, requireApiUser } from "@/app/api/_shared"
import { createCrmRecord, deleteCrmRecord, listCrmRecords, updateCrmRecord } from "@/services/crm-repository"

export async function GET(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response
  return ok(await listCrmRecords("leads"))
}

export async function POST(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const data = await createCrmRecord("leads", body)
  return accepted("Lead salvo.", { data })
}

export async function PUT(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({})) as Record<string, unknown> & { id?: string }
  if (!body.id) return Response.json({ error: "ID obrigatorio." }, { status: 400 })
  const data = await updateCrmRecord("leads", body.id, body)
  return ok(data)
}

export async function DELETE(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({})) as { id?: string }
  if (!body.id) return Response.json({ error: "ID obrigatorio." }, { status: 400 })
  await deleteCrmRecord("leads", body.id)
  return ok({ id: body.id })
}
