import { FinanceiroView } from "@/modules/financeiro/financeiro-view"
import { listCrmRecords, type CrmRecord } from "@/services/crm-repository"

export default async function FinanceiroPage() {
  const records = await listCrmRecords("financeiro")
  return <FinanceiroView dbRecords={Array.isArray(records) ? (records as CrmRecord[]) : []} />
}
