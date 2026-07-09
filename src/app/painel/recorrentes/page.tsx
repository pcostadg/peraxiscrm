import { RecorrentesView } from "@/modules/recorrentes/recorrentes-view"
import { listCrmRecords, type CrmRecord } from "@/services/crm-repository"

export default async function RecorrentesPage() {
  const [faturas, leads] = await Promise.all([listCrmRecords("recorrentes"), listCrmRecords("leads")])
  return <RecorrentesView dbRecords={Array.isArray(faturas) ? (faturas as CrmRecord[]) : []} leadRecords={Array.isArray(leads) ? (leads as CrmRecord[]) : []} />
}
