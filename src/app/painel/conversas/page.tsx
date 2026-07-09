import { ConversasView } from "@/modules/conversas/conversas-view"
import { listCrmRecords, type CrmRecord } from "@/services/crm-repository"

export default async function ConversasPage() {
  const records = await listCrmRecords("conversas")
  return <ConversasView dbRecords={Array.isArray(records) ? records as CrmRecord[] : []} />
}
