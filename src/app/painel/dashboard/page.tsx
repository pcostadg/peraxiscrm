import { DashboardView } from "@/modules/dashboard/dashboard-view"
import { listCrmRecords, type CrmRecord } from "@/services/crm-repository"

function isProjectRecord(record: CrmRecord) {
  const recordType = record.data?.recordType
  return record.module === "projetos" && recordType !== "project_stage_config" && recordType !== "task" && recordType !== "task_stage_config"
}

function isLeadBoardConfigRecord(record: CrmRecord) {
  return record.data?.recordType === "lead_stage_config"
}

export default async function DashboardPage() {
  const [leads, conversas, disparos, projetos, financeiro] = await Promise.all([
    listCrmRecords("leads"),
    listCrmRecords("conversas"),
    listCrmRecords("disparos"),
    listCrmRecords("projetos"),
    listCrmRecords("financeiro"),
  ])

  const leadRecords = Array.isArray(leads) ? (leads as CrmRecord[]).filter((record) => !isLeadBoardConfigRecord(record)) : []
  const projectRecords = Array.isArray(projetos) ? (projetos as CrmRecord[]).filter(isProjectRecord) : []
  const financeRecords = Array.isArray(financeiro) ? (financeiro as CrmRecord[]) : []

  return <DashboardView dbCounts={{
    leads: leadRecords.length,
    conversas: Array.isArray(conversas) ? conversas.length : 0,
    disparos: Array.isArray(disparos) ? disparos.length : 0,
    projetos: projectRecords.length,
    financeiro: financeRecords.length,
  }} financeRecords={financeRecords} leadRecords={leadRecords} projectRecords={projectRecords} />
}
