"use client"

import { useState, type FormEvent } from "react"
import { Bot, Edit3, KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { agents } from "@/modules/shared/data"
import { buttonClass, Field, inputClass, ModuleHeader, PanelCard, Pill, textareaClass } from "@/modules/shared/components"
import type { Agent } from "@/types/crm"
import type { CrmRecord } from "@/services/crm-repository"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type AgentRecord = Agent & {
  numero: string
  instanceId: string
  instanceToken: string
  clientToken: string
  baseUrl: string
  sendTextUrl: string
}

type AgentFormState = {
  nome: string
  descricao: string
  status: Agent["status"]
  numero: string
  instanceId: string
  instanceToken: string
  clientToken: string
  baseUrl: string
  sendTextUrl: string
}

const emptyAgentForm: AgentFormState = {
  nome: "",
  descricao: "",
  status: "ativo",
  numero: "",
  instanceId: "",
  instanceToken: "",
  clientToken: "",
  baseUrl: "",
  sendTextUrl: "",
}

function maskSecret(value: string) {
  if (!value) return "Nao informado"
  if (value.length <= 8) return "********"
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

function agentFromRecord(record: CrmRecord): AgentRecord {
  const data = record.data
  return {
    id: record.id,
    nome: String(data.nome ?? record.title),
    descricao: String(data.descricao ?? ""),
    status: (record.status as Agent["status"]) ?? "ativo",
    numero: String(data.numero ?? ""),
    instanceId: String(data.instanceId ?? ""),
    instanceToken: String(data.instanceToken ?? ""),
    clientToken: String(data.clientToken ?? ""),
    baseUrl: String(data.baseUrl ?? ""),
    sendTextUrl: String(data.sendTextUrl ?? ""),
    phoneNumberId: String(data.instanceId ?? ""),
    wabaId: String(data.clientToken ?? ""),
    verifyTokenMasked: maskSecret(String(data.instanceToken ?? "")),
    fluxo: Array.isArray(data.fluxo)
      ? data.fluxo.map((step, index) => ({
          id: String(index),
          title: String((step as { title?: string }).title ?? `Passo ${index + 1}`),
          detail: String((step as { detail?: string }).detail ?? ""),
        }))
      : [],
  }
}

function formFromAgent(agent: AgentRecord): AgentFormState {
  return {
    nome: agent.nome,
    descricao: agent.descricao,
    status: agent.status,
    numero: agent.numero,
    instanceId: agent.instanceId,
    instanceToken: agent.instanceToken,
    clientToken: agent.clientToken,
    baseUrl: agent.baseUrl,
    sendTextUrl: agent.sendTextUrl,
  }
}

export function AgentesView({ dbRecords = [] }: { dbRecords?: CrmRecord[] }) {
  const initialAgents = dbRecords.length ? dbRecords.map(agentFromRecord) : agents.map((agent) => ({
    ...agent,
    numero: "",
    instanceId: agent.phoneNumberId,
    instanceToken: "",
    clientToken: agent.wabaId,
    baseUrl: "",
    sendTextUrl: "",
  }))

  const [agentItems, setAgentItems] = useState<AgentRecord[]>(initialAgents)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const [form, setForm] = useState<AgentFormState>(emptyAgentForm)

  function openNewAgent() {
    setEditingAgentId(null)
    setForm(emptyAgentForm)
    setDialogOpen(true)
  }

  function openEditAgent(agent: AgentRecord) {
    setEditingAgentId(agent.id)
    setForm(formFromAgent(agent))
    setDialogOpen(true)
  }

  async function handleSaveAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: AgentRecord = {
      id: editingAgentId ?? `agent-${Date.now()}`,
      nome: form.nome.trim() || "Agente sem nome",
      descricao: form.descricao.trim(),
      status: form.status,
      numero: form.numero.trim(),
      instanceId: form.instanceId.trim(),
      instanceToken: form.instanceToken.trim(),
      clientToken: form.clientToken.trim(),
      baseUrl: form.baseUrl.trim(),
      sendTextUrl: form.sendTextUrl.trim(),
      phoneNumberId: form.instanceId.trim(),
      wabaId: form.clientToken.trim(),
      verifyTokenMasked: maskSecret(form.instanceToken.trim()),
      fluxo: [
        { id: "1", title: "Recepcao", detail: "Entrada do numero e saudacao inicial." },
        { id: "2", title: "Qualificacao", detail: "Identifica contexto e encaminha o atendimento." },
        { id: "3", title: "Execucao", detail: "Opera com a instancia Z-API vinculada ao agente." },
      ],
    }

    try {
      const response = await fetch("/api/agentes", {
        method: editingAgentId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel salvar o agente.")

      const persisted = agentFromRecord(result.data ?? result)
      setAgentItems((current) => {
        if (editingAgentId) {
          return current.map((item) => (item.id === editingAgentId ? persisted : item))
        }
        return [persisted, ...current]
      })

      setDialogOpen(false)
      toast.success(editingAgentId ? "Agente atualizado." : "Agente criado.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar agente.")
    }
  }

  async function handleDeleteAgent(id: string) {
    const previous = agentItems
    setAgentItems((current) => current.filter((item) => item.id !== id))
    try {
      const response = await fetch("/api/agentes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || "Nao foi possivel excluir o agente.")
      }
      toast.success("Agente excluido.")
    } catch (error) {
      setAgentItems(previous)
      toast.error(error instanceof Error ? error.message : "Falha ao excluir agente.")
    }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={Bot}
        title="Agentes"
        description="Cadastro por pop-up com credenciais da Z-API tratadas para uso seguro no backend."
        action={
          <button type="button" className={buttonClass} onClick={openNewAgent}>
            <Plus size={18} />
            Novo agente
          </button>
        }
      />

      <PanelCard className="border-blue-100 bg-blue-50/70">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 text-blue-600" size={18} />
          <div>
            <p className="text-sm font-semibold text-slate-900">Z-API configurada com seguranca</p>
            <p className="mt-1 text-sm text-slate-600">
              As credenciais devem ficar trafegando e armazenadas pelo backend. Aqui o time gerencia o agente e a referencia da instancia, sem expor token em tela publica.
            </p>
          </div>
        </div>
      </PanelCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {agentItems.length ? (
          agentItems.map((agent) => (
            <PanelCard key={agent.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{agent.nome}</h3>
                  <p className="mt-1 text-sm text-slate-500">{agent.descricao || "Sem descricao cadastrada."}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={agent.status === "ativo" ? "emerald" : "slate"}>{agent.status}</Pill>
                  <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600" onClick={() => openEditAgent(agent)}>
                    <Edit3 size={15} />
                  </button>
                  <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600" onClick={() => handleDeleteAgent(agent.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-500">Numero</span>
                  <strong className="mt-1 block text-slate-900">{agent.numero || "Nao informado"}</strong>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-500">Instance ID</span>
                  <strong className="mt-1 block text-slate-900">{agent.instanceId || "Nao informado"}</strong>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-500">Client Token</span>
                  <strong className="mt-1 block text-slate-900">{maskSecret(agent.clientToken)}</strong>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <KeyRound size={16} />
                  Fluxo do agente
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {agent.fluxo.map((step) => (
                    <div key={step.id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                      <strong className="text-slate-900">{step.title}</strong>
                      <p className="mt-1 text-slate-500">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </PanelCard>
          ))
        ) : (
          <PanelCard>
            <p className="text-sm text-slate-500">Nenhum agente cadastrado ainda.</p>
          </PanelCard>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[min(96vw,1320px)] max-w-[min(96vw,1320px)] overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-0 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.48)]">
          <form onSubmit={handleSaveAgent}>
            <DialogHeader className="border-b border-slate-200 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_72%)] px-8 py-7">
              <DialogTitle>{editingAgentId ? "Editar agente" : "Novo agente Z-API"}</DialogTitle>
              <DialogDescription>
                Cadastre os dados operacionais da instancia. O ideal e persistir as credenciais reais no backend, nunca em componentes publicos.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 px-8 py-8 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <Field label="Nome"><input required className={inputClass} value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Agente comercial" /></Field>
              <Field label="Status"><select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Agent["status"] }))}><option value="ativo">ativo</option><option value="inativo">inativo</option></select></Field>
              <Field label="Numero"><input className={inputClass} value={form.numero} onChange={(event) => setForm((current) => ({ ...current, numero: event.target.value }))} placeholder="+5511999999999" /></Field>
              <Field label="Instance ID"><input className={inputClass} value={form.instanceId} onChange={(event) => setForm((current) => ({ ...current, instanceId: event.target.value }))} placeholder="ID da instancia" /></Field>
              <Field label="Instance token"><input className={inputClass} type="password" value={form.instanceToken} onChange={(event) => setForm((current) => ({ ...current, instanceToken: event.target.value }))} placeholder="Token da instancia" /></Field>
              <Field label="Client token"><input className={inputClass} type="password" value={form.clientToken} onChange={(event) => setForm((current) => ({ ...current, clientToken: event.target.value }))} placeholder="Client token" /></Field>
              <Field label="Base URL"><input className={inputClass} value={form.baseUrl} onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="https://api.z-api.io/instances/..." /></Field>
              <Field label="Send text URL"><input className={inputClass} value={form.sendTextUrl} onChange={(event) => setForm((current) => ({ ...current, sendTextUrl: event.target.value }))} placeholder="Endpoint de envio" /></Field>
              <div className="md:col-span-2 xl:col-span-4">
                <Field label="Descricao">
                  <textarea className={textareaClass} value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} placeholder="Regras, objetivo e observacoes do agente" />
                </Field>
              </div>
            </div>

            <DialogFooter className="border-slate-200 bg-slate-50 px-8 py-6">
              <button type="button" className="inline-flex h-11 min-w-32 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700" onClick={() => setDialogOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className={`${buttonClass} min-w-36 px-5`}>
                {editingAgentId ? "Salvar alteracoes" : "Salvar agente"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
