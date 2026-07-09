"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { CheckCircle2, Pencil, Plus, Repeat2, Trash2 } from "lucide-react"
import { brl } from "@/modules/shared/data"
import { buttonClass, Field, inputClass, ModuleHeader, PanelCard, Pill } from "@/modules/shared/components"
import type { CrmRecord } from "@/services/crm-repository"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type InvoiceRecord = {
  id: string
  cliente: string
  telefone: string
  plano: string
  mensalidade: number
  valorAPagar: number
  vencimento: string
  status: "ativo" | "pausado" | "cancelado"
  formaPagamento: string
  quantidadeParcelas?: number
  valorParcela?: number
  pago: boolean
  origem: "manual" | "lead"
  leadId?: string
}

type InvoiceFormState = {
  cliente: string
  telefone: string
  plano: string
  mensalidade: string
  valorAPagar: string
  vencimento: string
  formaPagamento: string
  quantidadeParcelas: string
  valorParcela: string
  status: "ativo" | "pausado" | "cancelado"
}

const emptyForm: InvoiceFormState = {
  cliente: "",
  telefone: "",
  plano: "",
  mensalidade: "",
  valorAPagar: "",
  vencimento: "",
  formaPagamento: "Pix",
  quantidadeParcelas: "",
  valorParcela: "",
  status: "ativo",
}

function currencyFromInput(value: string) {
  return Number(value.replace(/\D/g, "")) / 100 || 0
}

function formatCurrency(value: string) {
  const digits = value.replace(/\D/g, "")
  const amount = Number(digits || "0") / 100
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount)
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 13)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function invoiceFromRecord(record: CrmRecord): InvoiceRecord {
  const data = record.data
  return {
    id: record.id,
    cliente: String(data.cliente ?? record.title),
    telefone: String(data.telefone ?? ""),
    plano: String(data.plano ?? ""),
    mensalidade: Number(data.mensalidade ?? 0),
    valorAPagar: Number(data.valorAPagar ?? 0),
    vencimento: String(data.vencimento ?? ""),
    status: (data.status as InvoiceRecord["status"]) ?? "ativo",
    formaPagamento: String(data.formaPagamento ?? "Pix"),
    quantidadeParcelas: Number(data.quantidadeParcelas ?? 0) || undefined,
    valorParcela: Number(data.valorParcela ?? 0) || undefined,
    pago: Boolean(data.pago ?? false),
    origem: "manual",
  }
}

function invoiceFromLead(record: CrmRecord): InvoiceRecord | null {
  const data = record.data
  const status = String(record.status ?? data.status ?? "")
  if (status !== "fechado") return null

  return {
    id: `lead-invoice-${record.id}`,
    cliente: String(data.nome ?? record.title),
    telefone: String(data.telefone ?? ""),
    plano: String(data.plano ?? data.produto ?? "Lead fechado"),
    mensalidade: Number(data.valor ?? 0),
    valorAPagar: Number(data.valor ?? 0),
    vencimento: String(data.vencimento ?? ""),
    status: "ativo",
    formaPagamento: String(data.formaPagamento ?? "Pix"),
    quantidadeParcelas: Number(data.quantidadeParcelas ?? 0) || undefined,
    valorParcela: Number(data.valorParcela ?? 0) || undefined,
    pago: String(data.statusPagamento ?? "pendente") === "pago",
    origem: "lead",
    leadId: record.id,
  }
}

function formFromInvoice(invoice: InvoiceRecord): InvoiceFormState {
  return {
    cliente: invoice.cliente,
    telefone: formatPhone(invoice.telefone),
    plano: invoice.plano,
    mensalidade: formatCurrency(String(invoice.mensalidade)),
    valorAPagar: formatCurrency(String(invoice.valorAPagar)),
    vencimento: invoice.vencimento,
    formaPagamento: invoice.formaPagamento,
    quantidadeParcelas: invoice.quantidadeParcelas ? String(invoice.quantidadeParcelas) : "",
    valorParcela: invoice.valorParcela ? formatCurrency(String(invoice.valorParcela)) : "",
    status: invoice.status,
  }
}

export function RecorrentesView({ dbRecords = [], leadRecords = [] }: { dbRecords?: CrmRecord[]; leadRecords?: CrmRecord[] }) {
  const initialManual = dbRecords.map(invoiceFromRecord)
  const initialLeadInvoices = leadRecords.map(invoiceFromLead).filter((item): item is InvoiceRecord => Boolean(item))
  const [manualInvoices, setManualInvoices] = useState(initialManual)
  const [leadInvoices, setLeadInvoices] = useState(initialLeadInvoices)
  const [leadSourceRecords, setLeadSourceRecords] = useState(leadRecords)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<InvoiceFormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function refreshData() {
      try {
        const [recurringResponse, leadsResponse] = await Promise.all([
          fetch("/api/recorrentes", { cache: "no-store" }),
          fetch("/api/leads", { cache: "no-store" }),
        ])
        const [recurringResult, leadsResult] = await Promise.all([recurringResponse.json(), leadsResponse.json()])
        if (cancelled) return

        if (recurringResponse.ok && Array.isArray(recurringResult.data)) {
          setManualInvoices((recurringResult.data as CrmRecord[]).map(invoiceFromRecord))
        }
        if (leadsResponse.ok && Array.isArray(leadsResult.data)) {
          const refreshedLeadRecords = leadsResult.data as CrmRecord[]
          setLeadSourceRecords(refreshedLeadRecords)
          setLeadInvoices(refreshedLeadRecords.map(invoiceFromLead).filter((item): item is InvoiceRecord => Boolean(item)))
        }
      } catch {
        // silent refresh
      }
    }

    const timer = window.setInterval(() => void refreshData(), 1500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const invoices = useMemo(() => [...leadInvoices, ...manualInvoices], [leadInvoices, manualInvoices])
  const total = invoices.filter((item) => !item.pago).reduce((sum, item) => sum + item.valorAPagar, 0)

  function openNewInvoice() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditInvoice(invoice: InvoiceRecord) {
    if (invoice.origem === "lead") {
      toast.error("Faturas vindas de leads fechados sao editadas pelo proprio lead.")
      return
    }
    setEditingId(invoice.id)
    setForm(formFromInvoice(invoice))
    setDialogOpen(true)
  }

  async function handleSaveInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      id: editingId ?? undefined,
      title: form.cliente.trim() || "Fatura",
      cliente: form.cliente.trim(),
      telefone: form.telefone.trim(),
      plano: form.plano.trim(),
      mensalidade: currencyFromInput(form.mensalidade),
      valorAPagar: currencyFromInput(form.valorAPagar),
      vencimento: form.vencimento,
      formaPagamento: form.formaPagamento,
      quantidadeParcelas: form.formaPagamento === "Parcelado" ? Number(form.quantidadeParcelas || 0) : undefined,
      valorParcela: form.formaPagamento === "Parcelado" ? currencyFromInput(form.valorParcela) : undefined,
      pago: false,
      status: form.status,
    }

    try {
      const response = await fetch("/api/recorrentes", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel salvar a fatura.")

      const persisted = invoiceFromRecord(result.data ?? result)
      setManualInvoices((current) => (editingId ? current.map((item) => (item.id === editingId ? persisted : item)) : [persisted, ...current]))
      setDialogOpen(false)
      toast.success(editingId ? "Fatura atualizada." : "Fatura criada.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar fatura.")
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkAsPaid(invoice: InvoiceRecord) {
    if (invoice.pago) return

    try {
      if (invoice.origem === "lead" && invoice.leadId) {
        const leadRecord = leadSourceRecords.find((item) => item.id === invoice.leadId)
        if (!leadRecord) throw new Error("Lead vinculado nao encontrado.")
        const response = await fetch("/api/leads", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(leadRecord.data as Record<string, unknown>), id: leadRecord.id, title: leadRecord.title, statusPagamento: "pago" }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Nao foi possivel atualizar o lead.")
        setLeadInvoices((current) => current.map((item) => (item.id === invoice.id ? { ...item, pago: true } : item)))
      } else {
        const response = await fetch("/api/recorrentes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...invoice, id: invoice.id, title: invoice.cliente, pago: true }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Nao foi possivel atualizar a fatura.")
        const persisted = invoiceFromRecord(result.data ?? result)
        setManualInvoices((current) => current.map((item) => (item.id === invoice.id ? persisted : item)))
      }

      await fetch("/api/financeiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Recebimento ${invoice.cliente}`,
          descricao: `Recebimento de fatura de ${invoice.cliente}`,
          tipo: "entrada",
          categoria: "Faturas",
          valor: invoice.valorAPagar,
          data: new Date().toISOString().slice(0, 10),
          formaPagamento: invoice.formaPagamento,
          recorrenciaId: invoice.id,
          lead: invoice.origem === "lead" ? invoice.cliente : undefined,
          status: "pago",
        }),
      })

      toast.success("Fatura marcada como paga.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao marcar como pago.")
    }
  }

  async function handleDeleteInvoice(invoiceId: string) {
    try {
      const response = await fetch("/api/recorrentes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoiceId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel excluir a fatura.")
      setManualInvoices((current) => current.filter((item) => item.id !== invoiceId))
      toast.success("Fatura excluida.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir fatura.")
    }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={Repeat2}
        title="Faturas"
        description="Controle de faturas manuais e geradas automaticamente a partir dos leads fechados."
        action={<button className={buttonClass} onClick={openNewInvoice}><Plus size={18} /> Nova fatura</button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PanelCard><p className="text-sm text-slate-500">Faturas em aberto</p><p className="mt-2 text-2xl font-bold">{invoices.filter((item) => !item.pago).length}</p></PanelCard>
        <PanelCard><p className="text-sm text-slate-500">Receita prevista</p><p className="mt-2 text-2xl font-bold text-emerald-600">{brl(invoices.reduce((sum, item) => sum + item.valorAPagar, 0))}</p></PanelCard>
        <PanelCard><p className="text-sm text-slate-500">A receber</p><p className="mt-2 text-2xl font-bold text-blue-600">{brl(total)}</p></PanelCard>
      </div>

      <PanelCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Plano</th>
                <th className="p-3">Pagamento</th>
                <th className="p-3">Parcelas</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((item) => (
                <tr key={item.id}>
                  <td className="p-3">
                    <p className="font-semibold">{item.cliente}</p>
                    <p className="text-xs text-slate-500">{item.telefone || "Sem telefone"}</p>
                  </td>
                  <td className="p-3">{item.plano || "-"}</td>
                  <td className="p-3">{item.formaPagamento}</td>
                  <td className="p-3">{item.quantidadeParcelas ? `${item.quantidadeParcelas}x de ${brl(item.valorParcela ?? 0)}` : "-"}</td>
                  <td className="p-3 font-bold">{brl(item.valorAPagar)}</td>
                  <td className="p-3">{item.vencimento || "-"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Pill tone={item.pago ? "emerald" : "amber"}>{item.pago ? "pago" : "pendente"}</Pill>
                      <Pill tone={item.origem === "lead" ? "blue" : "slate"}>{item.origem === "lead" ? "lead fechado" : "manual"}</Pill>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      {!item.pago ? (
                        <button type="button" className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700" onClick={() => void handleMarkAsPaid(item)}>
                          <CheckCircle2 size={14} />
                          Pago
                        </button>
                      ) : null}
                      {item.origem === "manual" ? (
                        <>
                          <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600" onClick={() => openEditInvoice(item)}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600" onClick={() => void handleDeleteInvoice(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-0 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.48)]">
          <form onSubmit={handleSaveInvoice}>
            <DialogHeader className="border-b border-slate-200 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_72%)] px-8 py-6">
              <DialogTitle>{editingId ? "Editar fatura" : "Nova fatura"}</DialogTitle>
              <DialogDescription>Cadastro bonito e amplo para controlar cobrança, vencimento e parcelamento.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 px-8 py-7 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Cliente"><input className={inputClass} value={form.cliente} onChange={(event) => setForm((current) => ({ ...current, cliente: event.target.value }))} placeholder="Nome do cliente" /></Field>
              <Field label="Telefone"><input className={inputClass} value={form.telefone} onChange={(event) => setForm((current) => ({ ...current, telefone: formatPhone(event.target.value) }))} placeholder="(00) 00000-0000" /></Field>
              <Field label="Plano"><input className={inputClass} value={form.plano} onChange={(event) => setForm((current) => ({ ...current, plano: event.target.value }))} placeholder="Plano ou contrato" /></Field>
              <Field label="Status"><select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as InvoiceFormState["status"] }))}><option value="ativo">ativo</option><option value="pausado">pausado</option><option value="cancelado">cancelado</option></select></Field>
              <Field label="Mensalidade"><input className={inputClass} inputMode="numeric" value={form.mensalidade} onChange={(event) => setForm((current) => ({ ...current, mensalidade: formatCurrency(event.target.value) }))} placeholder="R$ 0,00" /></Field>
              <Field label="Valor a pagar"><input className={inputClass} inputMode="numeric" value={form.valorAPagar} onChange={(event) => setForm((current) => ({ ...current, valorAPagar: formatCurrency(event.target.value) }))} placeholder="R$ 0,00" /></Field>
              <Field label="Vencimento"><input className={inputClass} type="date" value={form.vencimento} onChange={(event) => setForm((current) => ({ ...current, vencimento: event.target.value }))} /></Field>
              <Field label="Forma de pagamento"><select className={inputClass} value={form.formaPagamento} onChange={(event) => setForm((current) => ({ ...current, formaPagamento: event.target.value }))}><option>Pix</option><option>Cartao</option><option>Boleto</option><option>Dinheiro</option><option>Parcelado</option></select></Field>
              {form.formaPagamento === "Parcelado" ? (
                <>
                  <Field label="Quantidade de parcelas"><input className={inputClass} inputMode="numeric" value={form.quantidadeParcelas} onChange={(event) => setForm((current) => ({ ...current, quantidadeParcelas: event.target.value }))} placeholder="12" /></Field>
                  <Field label="Valor da parcela"><input className={inputClass} inputMode="numeric" value={form.valorParcela} onChange={(event) => setForm((current) => ({ ...current, valorParcela: formatCurrency(event.target.value) }))} placeholder="R$ 0,00" /></Field>
                </>
              ) : null}
            </div>

            <DialogFooter className="border-slate-200 bg-slate-50 px-8 py-5">
              <button type="button" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setDialogOpen(false)}>Cancelar</button>
              <button type="submit" className={buttonClass} disabled={saving}>Salvar</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
