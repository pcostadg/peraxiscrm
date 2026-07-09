import { ProjetosView } from "@/modules/projetos/projetos-view"
import { listCrmRecords, type CrmRecord } from "@/services/crm-repository"

export default async function ProjetosPage() {
  const records = await listCrmRecords("projetos")
  return <ProjetosView dbRecords={Array.isArray(records) ? records as CrmRecord[] : []} />
}
