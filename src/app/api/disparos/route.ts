import { accepted, ok, requireApiUser } from "@/app/api/_shared"
import { createCrmRecord, listCrmRecords } from "@/services/crm-repository"
import { parsePhoneList } from "@/services/validators"

export async function GET(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response
  return ok(await listCrmRecords("disparos"))
}

export async function POST(request: Request) {
  const { response } = await requireApiUser(request)
  if (response) return response
  const body = await request.json().catch(() => null) as ({ phones?: string } & Record<string, unknown>) | null
  const phones = parsePhoneList(body?.phones ?? "")
  const data = await createCrmRecord("disparos", { ...body, phones })
  return accepted("Disparo preparado no backend.", { data, phones, leadsCriados: phones.filter((item) => item.valid).length })
}
