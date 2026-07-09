"use client"

import { useState, type FormEvent } from "react"
import { Building2, Edit3, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { teamMembers } from "@/modules/shared/data"
import { buttonClass, Field, inputClass, ModuleHeader, PanelCard, Pill } from "@/modules/shared/components"
import type { SessionUser, TeamMember } from "@/types/crm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type TeamFormState = {
  nome: string
  email: string
  telefone: string
  cargo: string
  role: TeamMember["role"]
  status: TeamMember["status"]
}

const emptyTeamForm: TeamFormState = {
  nome: "",
  email: "",
  telefone: "",
  cargo: "",
  role: "funcionario",
  status: "ativo",
}

function formFromMember(member: TeamMember): TeamFormState {
  return {
    nome: member.nome,
    email: member.email,
    telefone: member.telefone,
    cargo: member.cargo,
    role: member.role,
    status: member.status,
  }
}

export type AppUserRecord = {
  id: string
  name: string
  email: string
  phone: string | null
  role: TeamMember["role"]
  status: TeamMember["status"]
}

function memberFromAppUser(record: AppUserRecord): TeamMember {
  return {
    id: record.id,
    nome: record.name,
    email: record.email,
    telefone: record.phone ?? "",
    cargo: "Equipe",
    role: record.role,
    status: record.status,
    conversasAtendidas: 0,
    leadsFechados: 0,
    tempoMedio: "0 min",
  }
}

export function EquipeView({ user, dbUsers = [] }: { user: SessionUser; dbUsers?: AppUserRecord[] }) {
  const [members, setMembers] = useState<TeamMember[]>(dbUsers.length ? dbUsers.map(memberFromAppUser) : teamMembers)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [form, setForm] = useState<TeamFormState>(emptyTeamForm)

  function openNewMember() {
    setEditingMemberId(null)
    setForm(emptyTeamForm)
    setDialogOpen(true)
  }

  function openEditMember(member: TeamMember) {
    setEditingMemberId(member.id)
    setForm(formFromMember(member))
    setDialogOpen(true)
  }

  async function handleSaveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: TeamMember = {
      id: editingMemberId ?? `member-${Date.now()}`,
      nome: form.nome.trim() || "Sem nome",
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      cargo: form.cargo.trim(),
      role: form.role,
      status: form.status,
      conversasAtendidas: editingMemberId
        ? members.find((item) => item.id === editingMemberId)?.conversasAtendidas ?? 0
        : 0,
      leadsFechados: editingMemberId
        ? members.find((item) => item.id === editingMemberId)?.leadsFechados ?? 0
        : 0,
      tempoMedio: editingMemberId
        ? members.find((item) => item.id === editingMemberId)?.tempoMedio ?? "0 min"
        : "0 min",
    }

    try {
      const response = await fetch("/api/equipe", {
        method: editingMemberId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMemberId ?? undefined,
          name: payload.nome,
          email: payload.email,
          phone: payload.telefone,
          cargo: payload.cargo,
          role: payload.role,
          status: payload.status,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel salvar o usuario.")

      const persisted = memberFromAppUser(result.data ?? result)
      persisted.cargo = payload.cargo
      setMembers((current) => {
        if (editingMemberId) {
          return current.map((item) => (item.id === editingMemberId ? { ...item, ...persisted } : item))
        }
        return [persisted, ...current]
      })

      setDialogOpen(false)
      toast.success(editingMemberId ? "Usuario atualizado." : "Usuario criado.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar usuario.")
    }
  }

  async function handleDeleteMember(id: string) {
    const previous = members
    setMembers((current) => current.filter((item) => item.id !== id))
    try {
      const response = await fetch("/api/equipe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || "Nao foi possivel excluir o usuario.")
      }
      toast.success("Usuario excluido.")
    } catch (error) {
      setMembers(previous)
      toast.error(error instanceof Error ? error.message : "Falha ao excluir usuario.")
    }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={Building2}
        title="Equipe"
        description="Cadastro e manutencao do time por pop-up, agora com botao claro de salvar."
        action={
          user.role === "admin" ? (
            <button type="button" className={buttonClass} onClick={openNewMember}>
              <Plus size={18} />
              Novo usuario
            </button>
          ) : null
        }
      />

      <PanelCard className="border-blue-100 bg-blue-50/70">
        <p className="text-sm text-slate-700">
          Funcionarios nao veem a aba Equipe e nao podem alterar senha de outros usuarios. Admins podem gerenciar todos os cadastros.
        </p>
      </PanelCard>

      <div className="grid gap-4 xl:grid-cols-3">
        {members.length ? (
          members.map((member) => (
            <PanelCard key={member.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{member.nome}</h3>
                  <p className="mt-1 text-sm text-slate-500">{member.email || "Sem email cadastrado"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={member.role === "admin" ? "blue" : "slate"}>{member.role}</Pill>
                  <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600" onClick={() => openEditMember(member)}>
                    <Edit3 size={15} />
                  </button>
                  <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600" onClick={() => handleDeleteMember(member.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck size={16} />
                {member.cargo || "Sem cargo"} · {member.status}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <strong>{member.conversasAtendidas}</strong>
                  <span className="block text-xs text-slate-500">conversas</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <strong>{member.leadsFechados}</strong>
                  <span className="block text-xs text-slate-500">leads</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <strong>{member.tempoMedio}</strong>
                  <span className="block text-xs text-slate-500">TMA</span>
                </div>
              </div>
            </PanelCard>
          ))
        ) : (
          <PanelCard>
            <p className="text-sm text-slate-500">Nenhum usuario cadastrado.</p>
          </PanelCard>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[min(96vw,1180px)] max-w-[min(96vw,1180px)] overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-0 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.48)]">
          <form onSubmit={handleSaveMember}>
            <DialogHeader className="border-b border-slate-200 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_72%)] px-8 py-7">
              <DialogTitle>{editingMemberId ? "Editar usuario" : "Novo usuario"}</DialogTitle>
              <DialogDescription>
                O cadastro foi movido para pop-up e agora possui acao explicita de salvar.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 px-8 py-8 xl:grid-cols-2">
              <Field label="Nome"><input required className={inputClass} value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Nome completo" /></Field>
              <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="email@empresa.com" /></Field>
              <Field label="Telefone"><input className={inputClass} value={form.telefone} onChange={(event) => setForm((current) => ({ ...current, telefone: event.target.value }))} placeholder="5511999999999" /></Field>
              <Field label="Cargo"><input className={inputClass} value={form.cargo} onChange={(event) => setForm((current) => ({ ...current, cargo: event.target.value }))} placeholder="Atendimento" /></Field>
              <Field label="Funcao"><select className={inputClass} value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as TeamMember["role"] }))}><option value="funcionario">funcionario</option><option value="admin">admin</option></select></Field>
              <Field label="Status"><select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TeamMember["status"] }))}><option value="ativo">ativo</option><option value="inativo">inativo</option></select></Field>
            </div>

            <DialogFooter className="border-slate-200 bg-slate-50 px-8 py-6">
              <button type="button" className="inline-flex h-11 min-w-32 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700" onClick={() => setDialogOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className={`${buttonClass} min-w-36 px-5`}>
                Salvar cadastro
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
