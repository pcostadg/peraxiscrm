import { LeadsView } from "@/modules/leads/leads-view"
import { listCrmRecords, type CrmRecord } from "@/services/crm-repository"

export default async function LeadsPage() {
  const records = await listCrmRecords("leads")
  return <LeadsView dbRecords={Array.isArray(records) ? records as CrmRecord[] : []} />
}
