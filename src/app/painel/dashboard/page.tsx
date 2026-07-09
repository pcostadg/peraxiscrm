import { DashboardView } from "@/modules/dashboard/dashboard-view"
import { listCrmRecords } from "@/services/crm-repository"

export default async function DashboardPage() {
  const [leads, conversas, disparos, projetos, financeiro] = await Promise.all([
    listCrmRecords("leads"),
    listCrmRecords("conversas"),
    listCrmRecords("disparos"),
    listCrmRecords("projetos"),
    listCrmRecords("financeiro"),
  ])

  return <DashboardView dbCounts={{
    leads: Array.isArray(leads) ? leads.length : 0,
    conversas: Array.isArray(conversas) ? conversas.length : 0,
    disparos: Array.isArray(disparos) ? disparos.length : 0,
    projetos: Array.isArray(projetos) ? projetos.length : 0,
    financeiro: Array.isArray(financeiro) ? financeiro.length : 0,
  }} />
}
