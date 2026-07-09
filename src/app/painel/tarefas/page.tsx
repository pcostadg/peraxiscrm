import { TarefasView } from "@/modules/tarefas/tarefas-view"
import { listCrmRecords, type CrmRecord } from "@/services/crm-repository"

export default async function TarefasPage() {
  const records = await listCrmRecords("projetos")
  return <TarefasView dbRecords={Array.isArray(records) ? (records as CrmRecord[]) : []} />
}
