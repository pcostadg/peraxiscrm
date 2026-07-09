"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react"
import { brl } from "@/modules/shared/data"
import { buttonClass, Field, inputClass, ModuleHeader, PanelCard, Pill } from "@/modules/shared/components"
import type { CrmRecord } from "@/services/crm-repository"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type FinanceRecord = {
  id: string
  tipo: "entrada" | "saida"
  descricao: string
  categoria: string
  valor: number
  data: string
  formaPagamento: string
  lead?: string
  projeto?: string
  recorrenciaId?: string
  status: string
}

type FinanceFormState = {
  tipo: "entrada" | "saida"
  descricao: string
  categoria: string
  valor: string
  data: string
  formaPagamento: string
  lead: string
  projeto: string
}

const emptyForm: FinanceFormState = {
  tipo: "entrada",
  descricao: "",
  categoria: "",
  valor: "",
  data: "",
  formaPagamento: "Pix",
  lead: "",
  projeto: "",
}

function formatCurrency(value: string) {
  const digits = value.replace(/\D/g, "")
  const amount = Number(digits || "0") / 100
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount)
}

function currencyFromInput(value: string) {
  return Number(value.replace(/\D/g, "")) / 100 || 0
}

function financeFromRecord(record: CrmRecord): FinanceRecord {
  const data = record.data
  return {
    id: record.id,
    tipo: (data.tipo as FinanceRecord["tipo"]) ?? "entrada",
    descricao: String(data.descricao ?? record.title),
    categoria: String(data.categoria ?? ""),
    valor: Number(data.valor ?? 0),
    data: String(data.data ?? ""),
    formaPagamento: String(data.formaPagamento ?? "Pix"),
    lead: data.lead ? String(data.lead) : undefined,
    projeto: data.projeto ? String(data.projeto) : undefined,
    recorrenciaId: data.recorrenciaId ? String(data.recorrenciaId) : undefined,
    status: String(data.status ?? "pendente"),
  }
}

function formFromFinance(item: FinanceRecord): FinanceFormState {
  return {
    tipo: item.tipo,
    descricao: item.descricao,
    categoria: item.categoria,
    valor: formatCurrency(String(item.valor)),
    data: item.data,
    formaPagamento: item.formaPagamento,
    lead: item.lead ?? "",
    projeto: item.projeto ?? "",
  }
}

export function FinanceiroView({ dbRecords = [] }: { dbRecords?: CrmRecord[] }) {
  const [items, setItems] = useState(dbRecords.map(financeFromRecord))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FinanceFormState>(emptyForm)

  useEffect(() => {
    let cancelled = false

    async function refreshEntries() {
      try {
        const response = await fetch("/api/financeiro", { cache: "no-store" })
        const result = await response.json()
        if (!response.ok || cancelled || !Array.isArray(result.data)) return
        setItems((result.data as CrmRecord[]).map(financeFromRecord))
      } catch {
        // silent
      }
    }

    const timer = window.setInterval(() => void refreshEntries(), 1500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const entradas = useMemo(() => items.filter((item) => item.tipo === "entrada").reduce((sum, item) => sum + item.valor, 0), [items])
  const saidas = useMemo(() => items.filter((item) => item.tipo === "saida").reduce((sum, item) => sum + item.valor, 0), [items])

  function openNewEntry() {
    setEditingId(null)
    setForm({ ...emptyForm, data: new Date().toISOString().slice(0, 10) })
    setDialogOpen(true)
  }

  function openEditEntry(item: FinanceRecord) {
    setEditingId(item.id)
    setForm(formFromFinance(item))
    setDialogOpen(true)
  }

  async function handleSaveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload = {
      id: editingId ?? undefined,
      title: form.descricao.trim() || "Lançamento",
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      categoria: form.categoria.trim(),
      valor: currencyFromInput(form.valor),
      data: form.data,
      formaPagamento: form.formaPagamento,
      lead: form.lead.trim() || undefined,
      projeto: form.projeto.trim() || undefined,
      status: "pago",
    }

    try {
      const response = await fetch("/api/financeiro", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel salvar o lançamento.")

      const persisted = financeFromRecord(result.data ?? result)
      setItems((current) => (editingId ? current.map((item) => (item.id === editingId ? persisted : item)) : [persisted, ...current]))
      setDialogOpen(false)
      toast.success(editingId ? "Lançamento atualizado." : "Lançamento criado.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar lançamento.")
    }
  }

  async function handleDeleteEntry(id: string) {
    try {
      const response = await fetch("/api/financeiro", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel excluir o lançamento.")
      setItems((current) => current.filter((item) => item.id !== id))
      toast.success("Lançamento excluído.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir lançamento.")
    }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader icon={CreditCard} title="Financeiro" description="Entradas, saídas, lucro e lançamentos integrados às faturas pagas." action={<button className={buttonClass} onClick={openNewEntry}><Plus size={18} /> Novo Lançamento</button>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <PanelCard><p className="text-sm text-slate-500">Faturamento total</p><p className="mt-2 text-2xl font-bold text-emerald-600">{brl(entradas)}</p></PanelCard>
        <PanelCard><p className="text-sm text-slate-500">Gastos</p><p className="mt-2 text-2xl font-bold text-rose-600">{brl(saidas)}</p></PanelCard>
        <PanelCard><p className="text-sm text-slate-500">Lucro</p><p className="mt-2 text-2xl font-bold text-blue-600">{brl(entradas - saidas)}</p></PanelCard>
      </div>

      <PanelCard>
        <h3 className="text-lg font-bold">Lançamentos</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="p-3">Descrição</th><th className="p-3">Tipo</th><th className="p-3">Categoria</th><th className="p-3">Data</th><th className="p-3">Pagamento</th><th className="p-3">Vínculo</th><th className="p-3 text-right">Valor</th><th className="p-3 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="p-3 font-semibold">{item.descricao}</td>
                  <td className="p-3"><Pill tone={item.tipo === "entrada" ? "emerald" : "rose"}>{item.tipo}</Pill></td>
                  <td className="p-3">{item.categoria}</td>
                  <td className="p-3">{item.data}</td>
                  <td className="p-3">{item.formaPagamento}</td>
                  <td className="p-3 text-slate-500">{item.lead || item.projeto || item.recorrenciaId || "Sem vínculo"}</td>
                  <td className="p-3 text-right font-bold">{brl(item.valor)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600" onClick={() => openEditEntry(item)}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600" onClick={() => void handleDeleteEntry(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-0 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.48)]">
          <form onSubmit={handleSaveEntry}>
            <DialogHeader className="border-b border-slate-200 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_72%)] px-8 py-6">
              <DialogTitle>{editingId ? "Editar lançamento" : "Novo Lançamento"}</DialogTitle>
              <DialogDescription>Cadastro financeiro em popup, com largura confortável e salvamento real.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 px-8 py-7 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Tipo"><select className={inputClass} value={form.tipo} onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value as FinanceFormState["tipo"] }))}><option value="entrada">entrada</option><option value="saida">saida</option></select></Field>
              <Field label="Descrição"><input className={inputClass} value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} placeholder="Descrição" /></Field>
              <Field label="Categoria"><input className={inputClass} value={form.categoria} onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))} placeholder="Categoria" /></Field>
              <Field label="Valor"><input className={inputClass} inputMode="numeric" value={form.valor} onChange={(event) => setForm((current) => ({ ...current, valor: formatCurrency(event.target.value) }))} placeholder="R$ 0,00" /></Field>
              <Field label="Data"><input className={inputClass} type="date" value={form.data} onChange={(event) => setForm((current) => ({ ...current, data: event.target.value }))} /></Field>
              <Field label="Forma de pagamento"><select className={inputClass} value={form.formaPagamento} onChange={(event) => setForm((current) => ({ ...current, formaPagamento: event.target.value }))}><option>Pix</option><option>Cartao</option><option>Boleto</option><option>Transferencia</option><option>Dinheiro</option></select></Field>
              <Field label="Lead"><input className={inputClass} value={form.lead} onChange={(event) => setForm((current) => ({ ...current, lead: event.target.value }))} placeholder="Opcional" /></Field>
              <Field label="Projeto"><input className={inputClass} value={form.projeto} onChange={(event) => setForm((current) => ({ ...current, projeto: event.target.value }))} placeholder="Opcional" /></Field>
            </div>

            <DialogFooter className="border-slate-200 bg-slate-50 px-8 py-5">
              <button type="button" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setDialogOpen(false)}>Cancelar</button>
              <button type="submit" className={buttonClass}>Salvar</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
