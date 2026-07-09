import { accepted, ok, requireApiUser } from "@/app/api/_shared"
import { createCrmRecord, listCrmRecords } from "@/services/crm-repository"

export async function GET(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response
  return ok(await listCrmRecords("notificar"))
}

export async function POST(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const data = await createCrmRecord("notificar", body)
  return accepted("Notificacao salva.", { data })
}
