import { accepted, ok, requireApiUser } from "@/app/api/_shared"
import { createCrmRecord, deleteCrmRecords, listCrmRecords } from "@/services/crm-repository"
import { parsePhoneList } from "@/services/validators"

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  return ok(await listCrmRecords("disparos", user.id))
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  const body = await request.json().catch(() => null) as ({ phones?: string } & Record<string, unknown>) | null
  const phones = parsePhoneList(body?.phones ?? "")
  const data = await createCrmRecord("disparos", { ...body, phones }, user.id)
  return accepted("Disparo preparado no backend.", { data, phones, leadsCriados: phones.filter((item) => item.valid).length })
}

export async function DELETE(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response

  const result = await deleteCrmRecords("disparos", user.id)
  return ok({ deletedCount: result.count })
}
