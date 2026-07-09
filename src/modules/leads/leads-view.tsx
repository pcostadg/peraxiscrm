"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Edit3, GripVertical, LayoutGrid, List, Pencil, Plus, Search, Trash2, Users } from "lucide-react"
import { brl, leads } from "@/modules/shared/data"
import { buttonClass, Field, inputClass, ModuleHeader, PanelCard, Pill, textareaClass } from "@/modules/shared/components"
import { formatCpfCnpj, formatCurrency, formatPhone } from "@/utils/formatters"
import { useRealtimeSync } from "@/services/use-realtime-sync"
import type { CrmRecord } from "@/services/crm-repository"
import type { Lead } from "@/types/crm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type LeadStage = {
  id: string
  title: string
}

type LeadBoardConfig = {
  id: string | null
  stages: LeadStage[]
}

type LeadRecord = Omit<Lead, "status"> & {
  status: string
}

type LeadFormState = {
  nome: string
  telefone: string
  email: string
  cpfCnpj: string
  endereco: string
  origem: Lead["origem"]
  status: string
  observacoes: string
  plano: string
  produto: string
  valor: string
  vencimento: string
  responsavel: string
  formaPagamento: string
  statusPagamento: Lead["statusPagamento"]
}

const defaultStages: LeadStage[] = [
  { id: "novo", title: "Novo" },
  { id: "contato", title: "Contato" },
  { id: "qualificado", title: "Qualificado" },
  { id: "proposta", title: "Proposta" },
  { id: "fechado", title: "Fechado" },
  { id: "perdido", title: "Perdido" },
]

const emptyLeadForm: LeadFormState = {
  nome: "",
  telefone: "",
  email: "",
  cpfCnpj: "",
  endereco: "",
  origem: "manual",
  status: "novo",
  observacoes: "",
  plano: "",
  produto: "",
  valor: "",
  vencimento: "",
  responsavel: "",
  formaPagamento: "Pix",
  statusPagamento: "pendente",
}

function titleFromStage(id: string) {
  return id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function normalizeStageId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function leadFromRecord(record: CrmRecord): LeadRecord {
  const data = record.data
  return {
    id: record.id,
    nome: String(data.nome ?? record.title),
    telefone: String(data.telefone ?? ""),
    email: String(data.email ?? ""),
    cpfCnpj: String(data.cpfCnpj ?? ""),
    endereco: String(data.endereco ?? ""),
    origem: (data.origem as Lead["origem"]) ?? "manual",
    status: String(record.status ?? data.status ?? "novo"),
    observacoes: String(data.observacoes ?? ""),
    plano: String(data.plano ?? ""),
    produto: String(data.produto ?? ""),
    valor: Number(data.valor ?? 0),
    vencimento: String(data.vencimento ?? ""),
    responsavel: String(data.responsavel ?? ""),
    formaPagamento: String(data.formaPagamento ?? "Pix"),
    statusPagamento: (data.statusPagamento as Lead["statusPagamento"]) ?? "pendente",
  }
}

function isLeadBoardConfigRecord(record: CrmRecord) {
  return record.data?.recordType === "lead_stage_config"
}

function getLeadBoardConfig(records: CrmRecord[]): LeadBoardConfig {
  const configRecord = records.find(isLeadBoardConfigRecord)
  const storedStages = Array.isArray(configRecord?.data?.stages)
    ? configRecord.data.stages
        .map((stage) => {
          if (!stage || typeof stage !== "object") return null
          const item = stage as Record<string, unknown>
          const id = String(item.id ?? "").trim()
          const title = String(item.title ?? "").trim()
          return id && title ? { id, title } : null
        })
        .filter((stage): stage is LeadStage => Boolean(stage))
    : []

  return {
    id: configRecord?.id ?? null,
    stages: storedStages,
  }
}

function buildStages(items: LeadRecord[], configuredStages: LeadStage[] = []) {
  const base = configuredStages.length ? [...configuredStages] : [...defaultStages]
  for (const item of items) {
    if (!base.some((stage) => stage.id === item.status)) {
      base.push({ id: item.status, title: titleFromStage(item.status) })
    }
  }
  return base
}

function formFromLead(lead: LeadRecord): LeadFormState {
  return {
    nome: lead.nome,
    telefone: formatPhone(lead.telefone),
    email: lead.email,
    cpfCnpj: formatCpfCnpj(lead.cpfCnpj),
    endereco: lead.endereco,
    origem: lead.origem,
    status: lead.status,
    observacoes: lead.observacoes,
    plano: lead.plano,
    produto: lead.produto,
    valor: formatCurrency(String(lead.valor)),
    vencimento: lead.vencimento,
    responsavel: lead.responsavel,
    formaPagamento: lead.formaPagamento,
    statusPagamento: lead.statusPagamento,
  }
}

export function LeadsView({ dbRecords = [] }: { dbRecords?: CrmRecord[] }) {
  const realtime = useRealtimeSync(["leads"])
  const leadRecords = dbRecords.filter((record) => !isLeadBoardConfigRecord(record))
  const boardConfig = getLeadBoardConfig(dbRecords)
  const initialLeads = leadRecords.length ? leadRecords.map(leadFromRecord) : leads
  const [viewMode, setViewMode] = useState<"lista" | "kanban">("lista")
  const [leadItems, setLeadItems] = useState<LeadRecord[]>(initialLeads)
  const [stages, setStages] = useState<LeadStage[]>(buildStages(initialLeads, boardConfig.stages))
  const [boardConfigId, setBoardConfigId] = useState<string | null>(boardConfig.id)
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null)
  const [form, setForm] = useState<LeadFormState>(emptyLeadForm)
  const [savingStages, setSavingStages] = useState(false)

  const filteredLeads = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return leadItems

    return leadItems.filter((lead) =>
      [lead.nome, lead.telefone, lead.email, lead.cpfCnpj, lead.responsavel]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    )
  }, [leadItems, query])

  const groupedLeads = useMemo(
    () =>
      stages.map((stage) => ({
        ...stage,
        items: filteredLeads.filter((lead) => lead.status === stage.id),
      })),
    [filteredLeads, stages],
  )

  function openNewLead() {
    setEditingLeadId(null)
    setForm({ ...emptyLeadForm, status: stages[0]?.id ?? "novo" })
    setDialogOpen(true)
  }

  function openEditLead(lead: LeadRecord) {
    setEditingLeadId(lead.id)
    setForm(formFromLead(lead))
    setDialogOpen(true)
  }

  async function handleSaveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: LeadRecord = {
      id: editingLeadId ?? `lead-${Date.now()}`,
      nome: form.nome.trim() || "Sem nome",
      telefone: form.telefone,
      email: form.email,
      cpfCnpj: form.cpfCnpj,
      endereco: form.endereco,
      origem: form.origem,
      status: form.status,
      observacoes: form.observacoes,
      plano: form.plano,
      produto: form.produto,
      valor: Number(form.valor.replace(/\D/g, "")) / 100 || 0,
      vencimento: form.vencimento,
      responsavel: form.responsavel,
      formaPagamento: form.formaPagamento,
      statusPagamento: form.statusPagamento,
    }

    try {
      const response = await fetch("/api/leads", {
        method: editingLeadId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel salvar o lead.")

      const persisted = leadFromRecord(result.data ?? result)
      setLeadItems((current) => {
        if (editingLeadId) {
          return current.map((item) => (item.id === editingLeadId ? persisted : item))
        }
        return [persisted, ...current]
      })

      if (!stages.some((stage) => stage.id === persisted.status)) {
        setStages((current) => [...current, { id: persisted.status, title: titleFromStage(persisted.status) }])
      }

      setDialogOpen(false)
      toast.success(editingLeadId ? "Lead atualizado." : "Lead criado.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar lead.")
    }
  }

  async function handleDeleteLead(id: string) {
    const previous = leadItems
    setLeadItems((current) => current.filter((item) => item.id !== id))
    try {
      const response = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || "Nao foi possivel excluir o lead.")
      }
      toast.success("Lead excluido.")
    } catch (error) {
      setLeadItems(previous)
      toast.error(error instanceof Error ? error.message : "Falha ao excluir lead.")
    }
  }

  function handleStageRename(id: string, title: string) {
    setStages((current) => current.map((stage) => (stage.id === id ? { ...stage, title } : stage)))
  }

  async function persistStages(nextStages: LeadStage[]) {
    setSavingStages(true)
    try {
      const payload = {
        id: boardConfigId ?? undefined,
        title: "Configuracao do kanban de leads",
        recordType: "lead_stage_config",
        stages: nextStages,
        status: "config",
      }

      const response = await fetch("/api/leads", {
        method: boardConfigId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel salvar as colunas.")

      const persisted = (result.data ?? result) as CrmRecord
      if (persisted?.id) setBoardConfigId(persisted.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar colunas.")
      throw error
    } finally {
      setSavingStages(false)
    }
  }

  async function handleAddStage() {
    const nextNumber = stages.length + 1
    const title = `Nova etapa ${nextNumber}`
    const id = normalizeStageId(title)
    const nextStages = [...stages, { id, title }]
    setStages(nextStages)
    try {
      await persistStages(nextStages)
      toast.success("Coluna criada.")
    } catch {}
  }

  async function handleDeleteStage(stageId: string) {
    if (stages.length <= 1) {
      toast.error("Voce precisa manter ao menos uma coluna no kanban.")
      return
    }

    const stage = stages.find((item) => item.id === stageId)
    if (!stage) return

    const targetStage = stages.find((item) => item.id !== stageId)
    if (!targetStage) return

    const stageLeads = leadItems.filter((item) => item.status === stageId)
    const previousLeads = leadItems
    const previousStages = stages
    const nextStages = stages.filter((item) => item.id !== stageId)
    const nextLeads = leadItems.map((item) => (item.status === stageId ? { ...item, status: targetStage.id } : item))

    if (
      !window.confirm(
        stageLeads.length
          ? `Excluir a coluna ${stage.title}? Os ${stageLeads.length} leads dela vao para ${targetStage.title}.`
          : `Excluir a coluna ${stage.title}?`,
      )
    ) {
      return
    }

    setStages(nextStages)
    setLeadItems(nextLeads)

    try {
      await Promise.all(
        stageLeads.map(async (lead) => {
          const response = await fetch("/api/leads", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...lead, status: targetStage.id }),
          })
          if (!response.ok) {
            const result = await response.json().catch(() => ({}))
            throw new Error(result.error || `Nao foi possivel mover o lead ${lead.nome}.`)
          }
        }),
      )

      await persistStages(nextStages)
      toast.success("Coluna excluida.")
    } catch (error) {
      setStages(previousStages)
      setLeadItems(previousLeads)
      toast.error(error instanceof Error ? error.message : "Falha ao excluir coluna.")
    }
  }

  function moveLeadToStage(leadId: string, stageId: string) {
    setLeadItems((current) => current.map((item) => (item.id === leadId ? { ...item, status: stageId } : item)))
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={Users}
        title="Leads"
        description="Gestao comercial com visual em lista ou kanban, criacao por pop-up e operacao mais limpa para o time."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={realtime.status === "tempo real" ? "emerald" : "amber"}>{realtime.status}</Pill>
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("lista")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${viewMode === "lista" ? "bg-blue-600 text-white" : "text-slate-600"}`}
              >
                <List size={16} />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${viewMode === "kanban" ? "bg-blue-600 text-white" : "text-slate-600"}`}
              >
                <LayoutGrid size={16} />
                Kanban
              </button>
            </div>
            <button type="button" className={buttonClass} onClick={openNewLead}>
              <Plus size={18} />
              Novo lead
            </button>
          </div>
        }
      />

      <PanelCard className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Search size={18} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 flex-1 bg-transparent text-sm outline-none"
              placeholder="Buscar por nome, telefone, email, CPF/CNPJ ou responsavel"
            />
          </div>

          {viewMode === "kanban" && (
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void handleAddStage()} disabled={savingStages}>
              <Plus size={18} />
              Nova coluna
            </button>
          )}
        </div>

        {viewMode === "lista" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr_0.9fr_120px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Cliente</span>
              <span>Telefone</span>
              <span>Email</span>
              <span>Etapa</span>
              <span>Valor</span>
              <span className="text-right">Acoes</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredLeads.length ? (
                filteredLeads.map((lead) => {
                  const stageTitle = stages.find((stage) => stage.id === lead.status)?.title ?? titleFromStage(lead.status)

                  return (
                    <div key={lead.id} className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr_0.9fr_120px] gap-3 px-4 py-4 text-sm text-slate-700">
                      <div>
                        <p className="font-semibold text-slate-900">{lead.nome}</p>
                        <p className="mt-1 text-xs text-slate-500">{lead.responsavel || "Sem responsavel"}</p>
                      </div>
                      <span>{formatPhone(lead.telefone.replace(/^55/, "")) || "-"}</span>
                      <span className="truncate">{lead.email || "-"}</span>
                      <Pill tone="blue">{stageTitle}</Pill>
                      <span className="font-semibold text-slate-900">{brl(lead.valor)}</span>
                      <div className="flex justify-end gap-2">
                        <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600" onClick={() => openEditLead(lead)} aria-label={`Editar ${lead.nome}`}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600" onClick={() => handleDeleteLead(lead.id)} aria-label={`Excluir ${lead.nome}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-slate-500">Nenhum lead encontrado com esse filtro.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
            {groupedLeads.map((stage) => (
              <PanelCard
                key={stage.id}
                className="flex min-h-[380px] flex-col border-dashed p-4"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingLeadId) moveLeadToStage(draggingLeadId, stage.id)
                  setDraggingLeadId(null)
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GripVertical size={16} className="text-slate-300" />
                    <input
                      value={stage.title}
                      onChange={(event) => handleStageRename(stage.id, event.target.value)}
                      onBlur={() => void persistStages(stages)}
                      className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone="slate">{stage.items.length}</Pill>
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void handleDeleteStage(stage.id)}
                      disabled={savingStages}
                      aria-label={`Excluir coluna ${stage.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex-1 space-y-3 rounded-2xl bg-slate-50/80 p-2">
                  {stage.items.length ? (
                    stage.items.map((lead) => (
                      <article
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggingLeadId(lead.id)}
                        onDragEnd={() => setDraggingLeadId(null)}
                        className="cursor-grab rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:cursor-grabbing"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{lead.nome}</p>
                            <p className="mt-1 text-xs text-slate-500">{formatPhone(lead.telefone.replace(/^55/, "")) || "Sem telefone"}</p>
                          </div>
                          <GripVertical size={16} className="text-slate-300" />
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-900">{brl(lead.valor)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Pill tone="blue">{lead.origem}</Pill>
                          <Pill tone={lead.statusPagamento === "pago" ? "emerald" : "amber"}>{lead.statusPagamento}</Pill>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button type="button" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700" onClick={() => openEditLead(lead)}>
                            <Edit3 size={14} />
                            Editar
                          </button>
                          <button type="button" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600" onClick={() => handleDeleteLead(lead.id)}>
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="flex h-full min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-center text-sm text-slate-400">
                      Arraste leads para esta etapa
                    </div>
                  )}
                </div>
              </PanelCard>
            ))}
          </div>
        )}
      </PanelCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl bg-white p-0">
          <form onSubmit={handleSaveLead}>
            <DialogHeader className="border-b border-slate-200 px-6 py-5">
              <DialogTitle>{editingLeadId ? "Editar lead" : "Novo lead"}</DialogTitle>
              <DialogDescription>
                O cadastro agora acontece por pop-up para a lista e o kanban ficarem livres para operacao.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Nome"><input required className={inputClass} value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Nome completo" /></Field>
              <Field label="Telefone"><input className={inputClass} inputMode="tel" value={form.telefone} onChange={(event) => setForm((current) => ({ ...current, telefone: formatPhone(event.target.value) }))} placeholder="(00) 00000-0000" /></Field>
              <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="cliente@email.com" /></Field>
              <Field label="CPF/CNPJ"><input className={inputClass} inputMode="numeric" value={form.cpfCnpj} onChange={(event) => setForm((current) => ({ ...current, cpfCnpj: formatCpfCnpj(event.target.value) }))} placeholder="000.000.000-00" /></Field>
              <Field label="Endereco"><input className={inputClass} value={form.endereco} onChange={(event) => setForm((current) => ({ ...current, endereco: event.target.value }))} placeholder="Rua, numero, cidade" /></Field>
              <Field label="Origem"><select className={inputClass} value={form.origem} onChange={(event) => setForm((current) => ({ ...current, origem: event.target.value as Lead["origem"] }))}><option value="manual">manual</option><option value="chatbot">chatbot</option><option value="anuncio">anuncio</option><option value="site">site</option><option value="indicacao">indicacao</option></select></Field>
              <Field label="Etapa"><select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}</select></Field>
              <Field label="Responsavel"><input className={inputClass} value={form.responsavel} onChange={(event) => setForm((current) => ({ ...current, responsavel: event.target.value }))} placeholder="Funcionario" /></Field>
              <Field label="Plano"><input className={inputClass} value={form.plano} onChange={(event) => setForm((current) => ({ ...current, plano: event.target.value }))} placeholder="Plano contratado" /></Field>
              <Field label="Produto"><input className={inputClass} value={form.produto} onChange={(event) => setForm((current) => ({ ...current, produto: event.target.value }))} placeholder="Produto/servico" /></Field>
              <Field label="Valor"><input className={inputClass} inputMode="numeric" value={form.valor} onChange={(event) => setForm((current) => ({ ...current, valor: formatCurrency(event.target.value) }))} placeholder="R$ 0,00" /></Field>
              <Field label="Vencimento"><input className={inputClass} type="date" value={form.vencimento} onChange={(event) => setForm((current) => ({ ...current, vencimento: event.target.value }))} /></Field>
              <Field label="Forma de pagamento"><select className={inputClass} value={form.formaPagamento} onChange={(event) => setForm((current) => ({ ...current, formaPagamento: event.target.value }))}><option>Pix</option><option>Cartao</option><option>Boleto</option><option>Dinheiro</option><option>Parcelado</option></select></Field>
              <Field label="Status de pagamento"><select className={inputClass} value={form.statusPagamento} onChange={(event) => setForm((current) => ({ ...current, statusPagamento: event.target.value as Lead["statusPagamento"] }))}><option value="pendente">pendente</option><option value="pago">pago</option><option value="atrasado">atrasado</option><option value="cancelado">cancelado</option></select></Field>
              <div className="md:col-span-2 xl:col-span-4">
                <Field label="Observacoes">
                  <textarea className={textareaClass} value={form.observacoes} onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))} placeholder="Historico e contexto comercial" />
                </Field>
              </div>
            </div>

            <DialogFooter className="border-slate-200 bg-slate-50">
              <button type="button" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setDialogOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className={buttonClass}>
                {editingLeadId ? "Salvar alteracoes" : "Salvar lead"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
