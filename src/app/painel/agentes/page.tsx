import { AgentesView } from "@/modules/agentes/agentes-view"
import { listCrmRecords, type CrmRecord } from "@/services/crm-repository"

export default async function AgentesPage() {
  const records = await listCrmRecords("agentes")
  return <AgentesView dbRecords={Array.isArray(records) ? records as CrmRecord[] : []} />
}
