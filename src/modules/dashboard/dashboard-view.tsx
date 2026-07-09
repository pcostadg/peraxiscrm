"use client"

import { useState } from "react"
import { BarChart3, CircleDollarSign, Clock3, FolderKanban, MessageCircle, TrendingUp, Users } from "lucide-react"
import { dashboardChartSeries, dashboardMetrics, dispatchReports, financeEntries, leads, projects } from "@/modules/shared/data"
import { ModuleHeader, PanelCard, Pill } from "@/modules/shared/components"
import { cn } from "@/lib/utils"
import { useRealtimeSync } from "@/services/use-realtime-sync"
import type { CrmRecord } from "@/services/crm-repository"
import { brl } from "@/modules/shared/data"

const icons = {
  faturamento: CircleDollarSign,
  leads: Users,
  conversas: MessageCircle,
  ativos: FolderKanban,
  pendentes: Clock3,
}

const toneClasses = {
  blue: "text-blue-600 bg-blue-50 ring-blue-100",
  emerald: "text-emerald-600 bg-emerald-50 ring-emerald-100",
  amber: "text-amber-600 bg-amber-50 ring-amber-100",
  rose: "text-rose-600 bg-rose-50 ring-rose-100",
  violet: "text-violet-600 bg-violet-50 ring-violet-100",
  slate: "text-slate-700 bg-slate-100 ring-slate-200",
}

function financeValueFromRecord(record: CrmRecord) {
  return Number(record.data?.valor ?? 0)
}

function financeTypeFromRecord(record: CrmRecord) {
  return String(record.data?.tipo ?? "entrada")
}

function projectStatusFromRecord(record: CrmRecord) {
  return String(record.status ?? record.data?.status ?? "")
}

function leadStatusFromRecord(record: CrmRecord) {
  return String(record.status ?? record.data?.status ?? "")
}

export function DashboardView({
  dbCounts,
  financeRecords = [],
  leadRecords = [],
  projectRecords = [],
}: {
  dbCounts?: { leads: number; conversas: number; disparos: number; projetos: number; financeiro: number }
  financeRecords?: CrmRecord[]
  leadRecords?: CrmRecord[]
  projectRecords?: CrmRecord[]
}) {
  const [activeId, setActiveId] = useState(dashboardMetrics[0]?.id ?? "faturamento")
  const realtime = useRealtimeSync(["leads", "conversas", "disparos", "projetos", "financeiro"])
  const liveFinanceEntries = financeRecords.length
    ? financeRecords.map((record) => ({
        tipo: financeTypeFromRecord(record),
        valor: financeValueFromRecord(record),
      }))
    : financeEntries

  const totalEntradas = liveFinanceEntries.filter((entry) => entry.tipo === "entrada").reduce((sum, entry) => sum + entry.valor, 0)
  const totalSaidas = liveFinanceEntries.filter((entry) => entry.tipo === "saida").reduce((sum, entry) => sum + entry.valor, 0)
  const activeProjectsCount = projectRecords.length
    ? projectRecords.filter((record) => projectStatusFromRecord(record) !== "concluido").length
    : projects.filter((project) => project.status !== "concluido").length
  const pendingProjectsCount = projectRecords.length
    ? projectRecords.filter((record) => {
        const status = projectStatusFromRecord(record)
        return status === "backlog" || status === "pendente"
      }).length
    : projects.filter((project) => project.status === "backlog").length
  const closedLeadsCount = leadRecords.length
    ? leadRecords.filter((record) => leadStatusFromRecord(record) === "fechado").length
    : leads.filter((lead) => lead.status === "fechado").length

  const metrics = dashboardMetrics.map((metric) => {
    if (!dbCounts) return metric
    if (metric.id === "faturamento") return { ...metric, value: brl(totalEntradas), trend: totalEntradas > 0 ? "recebido" : "0 no periodo" }
    if (metric.id === "leads") return { ...metric, value: String(dbCounts.leads) }
    if (metric.id === "conversas") return { ...metric, value: String(dbCounts.conversas) }
    if (metric.id === "ativos") return { ...metric, value: String(activeProjectsCount), trend: `${activeProjectsCount} em andamento` }
    if (metric.id === "pendentes") return { ...metric, value: String(pendingProjectsCount), trend: `${pendingProjectsCount} pendentes` }
    return metric
  }).filter((metric) => metric.id !== "disparos")
  const activeMetric = metrics.find((metric) => metric.id === activeId) ?? metrics[0]
  const activeSeries = activeMetric.series.length > 0 ? activeMetric.series : [0]
  const maxValue = Math.max(1, ...activeSeries)
  const xDivisor = Math.max(1, activeSeries.length - 1)

  const linePoints = activeSeries
    .map((value, index) => {
      const x = (index / xDivisor) * 100
      const y = 92 - (value / maxValue) * 76
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="space-y-6">
      <ModuleHeader icon={BarChart3} title="Dashboard" action={<Pill tone={realtime.status === "tempo real" ? "emerald" : "amber"}>{realtime.status}</Pill>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => {
          const Icon = icons[metric.id as keyof typeof icons] ?? BarChart3
          const isActive = metric.id === activeId

          return (
            <button
              key={metric.id}
              type="button"
              onClick={() => setActiveId(metric.id)}
              className={cn(
                "group flex flex-col rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:px-5 sm:py-5",
                isActive ? "border-blue-300 ring-4 ring-blue-100" : "border-slate-200",
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("flex size-10 items-center justify-center rounded-xl ring-1 transition group-hover:scale-105 sm:size-11", toneClasses[metric.tone])}>
                  <Icon size={20} />
                </div>
                <Pill tone={metric.tone}>{metric.trend}</Pill>
              </div>
              <p className="mt-4 text-sm text-slate-500">{metric.title}</p>
              <p className="mt-2 text-[2rem] leading-none font-bold text-slate-950">{metric.value}</p>
              <p className="mt-2 text-xs leading-none text-slate-400">{metric.hint}</p>
              <div className="mt-3 flex h-3 items-end gap-1">
                {metric.series.map((value, index) => (
                  <span
                    key={`${metric.id}-${index}`}
                    className={cn("flex-1 rounded-t bg-blue-500/70 transition-all duration-500", isActive ? "bg-blue-600" : "bg-slate-300")}
                    style={{ height: `${Math.max(6, (value / Math.max(1, ...metric.series)) * 100)}%` }}
                  />
              ))}
            </div>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <PanelCard className="overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">{activeMetric.title}</h3>
              <p className="mt-1 text-sm text-slate-500">Evolucao dos ultimos periodos</p>
            </div>
            <Pill tone={activeMetric.tone}>{activeMetric.value}</Pill>
          </div>

          <div className="mt-6 h-72 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              {[20, 40, 60, 80].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" className="text-slate-200" strokeWidth="0.35" />)}
              <polyline points={linePoints} fill="none" stroke="rgb(37 99 235)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {activeSeries.map((value, index) => {
                const x = (index / xDivisor) * 100
                const y = 92 - (value / maxValue) * 76
                return <circle key={index} cx={x} cy={y} r="1.4" fill="rgb(37 99 235)" vectorEffect="non-scaling-stroke" />
              })}
            </svg>
          </div>

          <div className="mt-4 grid grid-cols-6 gap-2 text-center text-xs text-slate-500">
            {dashboardChartSeries.map((item) => <span key={item.month}>{item.month}</span>)}
          </div>
        </PanelCard>

        <PanelCard>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={20} />
            <h3 className="text-lg font-bold">Resumo financeiro</h3>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between rounded-xl bg-slate-50 p-3"><span>Entradas</span><strong>R$ {totalEntradas.toLocaleString("pt-BR")}</strong></div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-3"><span>Saidas</span><strong>R$ {totalSaidas.toLocaleString("pt-BR")}</strong></div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-3"><span>Lucro</span><strong>R$ {(totalEntradas - totalSaidas).toLocaleString("pt-BR")}</strong></div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-bold">Distribuicao operacional</h4>
            <div className="mt-4 space-y-4">
              {[
                ["Leads fechados", closedLeadsCount, Math.max(1, closedLeadsCount || 1)],
                ["Projetos ativos", activeProjectsCount, Math.max(1, activeProjectsCount || 1)],
                ["Falhas em disparos", dispatchReports.reduce((sum, item) => sum + item.falha, 0), 40],
              ].map(([label, value, max]) => (
                <div key={String(label)}>
                  <div className="flex justify-between text-xs text-slate-500"><span>{label}</span><strong>{value}</strong></div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${Math.min(100, (Number(value) / Number(max)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PanelCard>
          <h3 className="text-lg font-bold">Projetos por etapa</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {["backlog", "em_andamento", "revisao", "concluido"].map((status) => (
              <div key={status} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs capitalize text-slate-500">{status.replace("_", " ")}</p>
                <p className="mt-2 text-2xl font-bold">{projects.filter((project) => project.status === status).length}</p>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard>
          <h3 className="text-lg font-bold">Funil comercial</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            {["novo", "contato", "qualificado", "proposta", "fechado"].map((status) => (
              <div key={status} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs capitalize text-slate-500">{status}</p>
                <p className="mt-2 text-2xl font-bold">{leads.filter((lead) => lead.status === status).length}</p>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </div>
  )
}
