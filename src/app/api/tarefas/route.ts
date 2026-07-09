import { accepted, ok, requireApiUser } from "@/app/api/_shared"
import { createCrmRecord, deleteCrmRecord, listCrmRecords, type CrmRecord, updateCrmRecord } from "@/services/crm-repository"

function isTaskRecord(payload: Record<string, unknown>) {
  return payload.recordType === "task" || payload.recordType === "task_stage_config"
}

export async function GET(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response

  const records = await listCrmRecords("projetos")
  const safeRecords = Array.isArray(records) ? (records as CrmRecord[]) : []
  return ok(safeRecords.filter((record) => isTaskRecord(record.data)))
}

export async function POST(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const payload = isTaskRecord(body) ? body : { ...body, recordType: "task" }
  const data = await createCrmRecord("projetos", payload)
  return accepted("Tarefa/coluna salva.", { data })
}

export async function PUT(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown> & { id?: string }
  if (!body.id) return Response.json({ error: "ID obrigatorio." }, { status: 400 })

  const payload = isTaskRecord(body) ? body : { ...body, recordType: "task" }
  const data = await updateCrmRecord("projetos", body.id, payload)
  return ok(data)
}

export async function DELETE(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response

  const body = (await request.json().catch(() => ({}))) as { id?: string }
  if (!body.id) return Response.json({ error: "ID obrigatorio." }, { status: 400 })

  await deleteCrmRecord("projetos", body.id)
  return ok({ id: body.id })
}
