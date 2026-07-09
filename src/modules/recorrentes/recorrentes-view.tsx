import { Repeat2, Plus } from "lucide-react"
import { brl, recurringClients } from "@/modules/shared/data"
import { buttonClass, Field, inputClass, ModuleHeader, PanelCard, Pill } from "@/modules/shared/components"

export function RecorrentesView() {
  const total = recurringClients.reduce((sum, item) => sum + item.valorAPagar, 0)

  return (
    <div className="space-y-6">
      <ModuleHeader icon={Repeat2} title="Recorrentes" description="Clientes com mensalidade recorrente, valor contratado e valor a pagar." action={<button className={buttonClass}><Plus size={18} /> Novo recorrente</button>} />

      <div className="grid gap-4 md:grid-cols-3">
        <PanelCard><p className="text-sm text-slate-500">Clientes ativos</p><p className="mt-2 text-2xl font-bold">{recurringClients.filter((item) => item.status === "ativo").length}</p></PanelCard>
        <PanelCard><p className="text-sm text-slate-500">Receita recorrente</p><p className="mt-2 text-2xl font-bold text-emerald-600">{brl(recurringClients.reduce((sum, item) => sum + item.mensalidade, 0))}</p></PanelCard>
        <PanelCard><p className="text-sm text-slate-500">A receber</p><p className="mt-2 text-2xl font-bold text-blue-600">{brl(total)}</p></PanelCard>
      </div>

      <PanelCard>
        <form className="grid gap-4 lg:grid-cols-6">
          <Field label="Cliente"><input className={inputClass} placeholder="Nome do cliente" /></Field>
          <Field label="Telefone"><input className={inputClass} placeholder="(00) 00000-0000" /></Field>
          <Field label="Plano"><input className={inputClass} placeholder="Plano" /></Field>
          <Field label="Mensalidade"><input className={inputClass} placeholder="R$ 0,00" /></Field>
          <Field label="Valor a pagar"><input className={inputClass} placeholder="R$ 0,00" /></Field>
          <Field label="Vencimento"><input className={inputClass} type="date" /></Field>
        </form>
      </PanelCard>

      <PanelCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="p-3">Cliente</th><th className="p-3">Telefone</th><th className="p-3">Plano</th><th className="p-3">Mensalidade</th><th className="p-3">A pagar</th><th className="p-3">Vencimento</th><th className="p-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{recurringClients.map((item) => <tr key={item.id}><td className="p-3 font-semibold">{item.cliente}</td><td className="p-3">{item.telefone}</td><td className="p-3">{item.plano}</td><td className="p-3">{brl(item.mensalidade)}</td><td className="p-3 font-bold">{brl(item.valorAPagar)}</td><td className="p-3">{item.vencimento}</td><td className="p-3"><Pill tone="emerald">{item.status}</Pill></td></tr>)}</tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  )
}
