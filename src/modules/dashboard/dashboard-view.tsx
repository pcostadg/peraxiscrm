"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, BarChart3, CircleDollarSign, Clock3, FolderKanban, MessageCircle, ShieldAlert, TrendingUp, Users, UserRoundCheck } from "lucide-react"
import { dashboardMetrics } from "@/modules/shared/data"
import { ModuleHeader, PanelCard, Pill } from "@/modules/shared/components"
import { cn } from "@/lib/utils"
import { useRealtimeSync } from "@/services/use-realtime-sync"
import type { CrmRecord } from "@/services/crm-repository"
import { brl } from "@/modules/shared/data"
import {
  WHATSAPP_BROADCAST_AUTO_PAUSE_FAILURES,
  WHATSAPP_BROADCAST_MAX_BATCH_SIZE,
  WHATSAPP_BROADCAST_MAX_PER_HOUR,
} from "@/config/whatsapp-broadcast"

const icons = {
  faturamento: CircleDollarSign,
  leads: Users,
  conversas: MessageCircle,
  ativos: FolderKanban,
  pendentes: Clock3,
  usuarios: UserRoundCheck,
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

function financeStatusFromRecord(record: CrmRecord) {
  return String(record.data?.status ?? "pendente")
}

function projectStatusFromRecord(record: CrmRecord) {
  return String(record.status ?? record.data?.status ?? "")
}

function isOperationalLeadRecord(record: CrmRecord) {
  return String(record.data?.recordType ?? "") !== "lead_stage_config"
}

function isOperationalProjectRecord(record: CrmRecord) {
  const recordType = String(record.data?.recordType ?? "")
  return recordType !== "project_stage_config" && recordType !== "task" && recordType !== "task_stage_config"
}

function leadStatusFromRecord(record: CrmRecord) {
  return String(record.status ?? record.data?.status ?? "")
}

function buildMonthBuckets() {
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short" })
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - index))
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: formatter.format(date).replace(".", ""),
    }
  })
  return months
}

function monthKeyFromDate(value: string | Date | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function dispatchSummaryValue(record: CrmRecord, key: string) {
  const summary = record.data?.summary
  if (!summary || typeof summary !== "object") return 0
  return Number((summary as Record<string, unknown>)[key] ?? 0)
}

function recipientStatusesFromDispatch(record: CrmRecord) {
  const value = record.data?.recipientStatuses
  return Array.isArray(value) ? value : []
}

function currentHourKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}`
}

function parseDateValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function DashboardView({
  dbCounts,
  dispatchRecords = [],
  financeRecords = [],
  leadRecords = [],
  projectRecords = [],
}: {
  dbCounts?: { leads: number; conversas: number; disparos: number; projetos: number; financeiro: number; usuarios: number }
  dispatchRecords?: CrmRecord[]
  financeRecords?: CrmRecord[]
  leadRecords?: CrmRecord[]
  projectRecords?: CrmRecord[]
}) {
  const [activeId, setActiveId] = useState(dashboardMetrics[0]?.id ?? "faturamento")
  const realtime = useRealtimeSync(["leads", "conversas", "disparos", "projetos", "financeiro"])
  const [liveLeadRecords, setLiveLeadRecords] = useState(leadRecords)
  const [liveProjectRecords, setLiveProjectRecords] = useState(projectRecords)
  const [liveFinanceRecords, setLiveFinanceRecords] = useState(financeRecords)
  const [liveDispatchRecords, setLiveDispatchRecords] = useState(dispatchRecords)
  const [conversationCount, setConversationCount] = useState(dbCounts?.conversas ?? 0)

  useEffect(() => {
    async function refreshDashboard() {
      try {
        const [leadsResponse, conversationsResponse, dispatchResponse, projectsResponse, financeResponse] = await Promise.all([
          fetch("/api/leads", { cache: "no-store" }),
          fetch("/api/conversas", { cache: "no-store" }),
          fetch("/api/disparos", { cache: "no-store" }),
          fetch("/api/projetos", { cache: "no-store" }),
          fetch("/api/financeiro", { cache: "no-store" }),
        ])
        const [leadsResult, conversationsResult, dispatchResult, projectsResult, financeResult] = await Promise.all([
          leadsResponse.json(),
          conversationsResponse.json(),
          dispatchResponse.json(),
          projectsResponse.json(),
          financeResponse.json(),
        ])

        if (leadsResponse.ok && Array.isArray(leadsResult.data)) {
          setLiveLeadRecords((leadsResult.data as CrmRecord[]).filter(isOperationalLeadRecord))
        }
        if (conversationsResponse.ok && Array.isArray(conversationsResult.data)) setConversationCount((conversationsResult.data as CrmRecord[]).length)
        if (dispatchResponse.ok && Array.isArray(dispatchResult.data)) setLiveDispatchRecords(dispatchResult.data as CrmRecord[])
        if (projectsResponse.ok && Array.isArray(projectsResult.data)) {
          setLiveProjectRecords((projectsResult.data as CrmRecord[]).filter(isOperationalProjectRecord))
        }
        if (financeResponse.ok && Array.isArray(financeResult.data)) setLiveFinanceRecords(financeResult.data as CrmRecord[])
      } catch {
        // best effort refresh
      }
    }

    void refreshDashboard()
  }, [realtime.tick])

  const liveFinanceEntries = liveFinanceRecords.map((record) => ({
    tipo: financeTypeFromRecord(record),
    valor: financeValueFromRecord(record),
    status: financeStatusFromRecord(record),
  }))
  const operationalLeadRecords = liveLeadRecords.filter(isOperationalLeadRecord)
  const operationalProjectRecords = liveProjectRecords.filter(isOperationalProjectRecord)

  const totalEntradas = liveFinanceEntries.filter((entry) => entry.tipo === "entrada" && entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0)
  const totalSaidas = liveFinanceEntries.filter((entry) => entry.tipo === "saida" && entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0)
  const activeProjectsCount = operationalProjectRecords.filter((record) => {
    const status = projectStatusFromRecord(record)
    return status === "em_andamento" || status === "revisao"
  }).length
  const pendingProjectsCount = operationalProjectRecords.filter((record) => {
    const status = projectStatusFromRecord(record)
    return status === "backlog" || status === "pendente"
  }).length
  const closedLeadsCount = operationalLeadRecords.filter((record) => leadStatusFromRecord(record) === "fechado").length
  const dispatchFailures = liveDispatchRecords.reduce(
    (sum, record) => sum + dispatchSummaryValue(record, "falhaValidacao") + dispatchSummaryValue(record, "falhaEnvio"),
    0,
  )
  const activeDispatches = liveDispatchRecords.filter((record) => {
    const status = String(record.data?.status ?? record.status ?? "")
    return status === "agendado" || status === "processando-local"
  }).length
  const autoPausedDispatches = liveDispatchRecords.filter((record) => String(record.data?.status ?? record.status ?? "") === "auto_pausado").length
  const interruptedDispatches = liveDispatchRecords.filter((record) => String(record.data?.status ?? record.status ?? "").startsWith("interrompido")).length
  const currentHourReservations = liveDispatchRecords.reduce((sum, record) => {
    return sum + recipientStatusesFromDispatch(record).filter((entry) => {
      if (!entry || typeof entry !== "object") return false
      const item = entry as Record<string, unknown>
      const status = String(item.status ?? "")
      if (status === "interrompido" || status === "auto_pausado" || status === "ignorado_duplicado") return false
      const reference = parseDateValue(item.scheduledFor ?? item.sentAt)
      return reference ? currentHourKey(reference) === currentHourKey() : false
    }).length
  }, 0)
  const recentDispatchFailures = liveDispatchRecords.reduce((sum, record) => {
    const updatedAt = parseDateValue(record.updated_at)
    if (!updatedAt) return sum
    const last24Hours = Date.now() - updatedAt.getTime() <= 24 * 60 * 60 * 1000
    if (!last24Hours) return sum
    return sum + dispatchSummaryValue(record, "falhaValidacao") + dispatchSummaryValue(record, "falhaEnvio")
  }, 0)
  const healthTone =
    autoPausedDispatches > 0
      ? "rose"
      : recentDispatchFailures >= Math.max(2, WHATSAPP_BROADCAST_AUTO_PAUSE_FAILURES - 1)
        ? "amber"
        : "emerald"
  const healthLabel =
    autoPausedDispatches > 0
      ? "Pausado por falhas"
      : recentDispatchFailures >= Math.max(2, WHATSAPP_BROADCAST_AUTO_PAUSE_FAILURES - 1)
        ? "Em atencao"
        : "Saudavel"
  const monthBuckets = useMemo(() => buildMonthBuckets(), [])
  const chartLabels = monthBuckets.map((item) => item.label)
  const financeSeries = monthBuckets.map((bucket) =>
    liveFinanceRecords
      .filter((record) => monthKeyFromDate(record.data?.data as string | undefined) === bucket.key)
      .filter((record) => financeTypeFromRecord(record) === "entrada" && financeStatusFromRecord(record) === "pago")
      .reduce((sum, record) => sum + financeValueFromRecord(record), 0),
  )
  const closedLeadsSeries = monthBuckets.map((bucket) =>
    operationalLeadRecords.filter((record) => monthKeyFromDate(record.updated_at) === bucket.key && leadStatusFromRecord(record) === "fechado").length,
  )
  const conversationSeries = monthBuckets.map(() => 0)
  const activeProjectsSeries = monthBuckets.map((bucket) =>
    operationalProjectRecords.filter((record) => {
      const status = projectStatusFromRecord(record)
      return monthKeyFromDate(record.updated_at) === bucket.key && (status === "em_andamento" || status === "revisao")
    }).length,
  )
  const pendingProjectsSeries = monthBuckets.map((bucket) =>
    operationalProjectRecords.filter((record) => {
      const status = projectStatusFromRecord(record)
      return monthKeyFromDate(record.updated_at) === bucket.key && (status === "backlog" || status === "pendente")
    }).length,
  )
  const activeUsersSeries = monthBuckets.map(() => dbCounts?.usuarios ?? 0)

  const metrics = dashboardMetrics.map((metric) => {
    if (!dbCounts) return metric
    if (metric.id === "faturamento") return { ...metric, value: brl(totalEntradas), trend: totalEntradas > 0 ? "recebido" : "0 no periodo", series: financeSeries }
    if (metric.id === "leads") return { ...metric, value: String(closedLeadsCount), trend: `${closedLeadsCount} fechados`, series: closedLeadsSeries }
    if (metric.id === "conversas") return { ...metric, value: String(conversationCount), series: conversationSeries }
    if (metric.id === "ativos") return { ...metric, value: String(activeProjectsCount), trend: `${activeProjectsCount} em andamento`, series: activeProjectsSeries }
    if (metric.id === "pendentes") return { ...metric, value: String(pendingProjectsCount), trend: `${pendingProjectsCount} pendentes`, series: pendingProjectsSeries }
    if (metric.id === "usuarios") return { ...metric, value: String(dbCounts.usuarios), trend: `${dbCounts.usuarios} ativos`, series: activeUsersSeries }
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
            {chartLabels.map((item) => <span key={item}>{item}</span>)}
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
                ["Falhas em disparos", dispatchFailures, Math.max(1, dispatchFailures || 1)],
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

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <PanelCard>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold">Saude da instancia</h3>
            </div>
            <Pill tone={healthTone}>{healthLabel}</Pill>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Limite por lote</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{WHATSAPP_BROADCAST_MAX_BATCH_SIZE}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Teto por hora</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{WHATSAPP_BROADCAST_MAX_PER_HOUR}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Pausa automatica</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{WHATSAPP_BROADCAST_AUTO_PAUSE_FAILURES} falhas</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Reservas nesta hora</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{currentHourReservations}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Activity size={16} />
                <span className="text-xs font-semibold uppercase tracking-wide">Agendados</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-950">{activeDispatches}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Auto pausados</p>
              <p className="mt-2 text-2xl font-bold text-rose-600">{autoPausedDispatches}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interrompidos</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">{interruptedDispatches}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {[
              ["Uso do teto horario", currentHourReservations, WHATSAPP_BROADCAST_MAX_PER_HOUR],
              ["Falhas nas ultimas 24h", recentDispatchFailures, Math.max(1, WHATSAPP_BROADCAST_AUTO_PAUSE_FAILURES)],
            ].map(([label, value, max]) => (
              <div key={String(label)}>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${Math.min(100, (Number(value) / Number(max)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </PanelCard>

        <div className="grid gap-4">
        <PanelCard>
          <h3 className="text-lg font-bold">Projetos por etapa</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {["backlog", "em_andamento", "revisao", "concluido"].map((status) => (
              <div key={status} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs capitalize text-slate-500">{status.replace("_", " ")}</p>
                <p className="mt-2 text-2xl font-bold">
                  {liveProjectRecords.length
                    ? liveProjectRecords.filter((record) => projectStatusFromRecord(record) === status).length
                    : 0}
                </p>
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
                <p className="mt-2 text-2xl font-bold">
                  {liveLeadRecords.length
                    ? liveLeadRecords.filter((record) => leadStatusFromRecord(record) === status).length
                    : 0}
                </p>
              </div>
            ))}
          </div>
        </PanelCard>
        </div>
      </div>
    </div>
  )
}
