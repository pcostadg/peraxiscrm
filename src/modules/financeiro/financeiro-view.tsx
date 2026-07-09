import { CreditCard, Plus } from "lucide-react"
import { brl, financeEntries } from "@/modules/shared/data"
import { buttonClass, Field, inputClass, ModuleHeader, PanelCard, Pill } from "@/modules/shared/components"

export function FinanceiroView() {
  const entradas = financeEntries.filter((item) => item.tipo === "entrada").reduce((sum, item) => sum + item.valor, 0)
  const saidas = financeEntries.filter((item) => item.tipo === "saida").reduce((sum, item) => sum + item.valor, 0)

  return (
    <div className="space-y-6">
      <ModuleHeader icon={CreditCard} title="Financeiro" description="Entradas, saidas, lucro, categorias e vinculo com lead/projeto." action={<button className={buttonClass}><Plus size={18} /> Novo lancamento</button>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <PanelCard><p className="text-sm text-slate-500">Faturamento total</p><p className="mt-2 text-2xl font-bold text-emerald-600">{brl(entradas)}</p></PanelCard>
        <PanelCard><p className="text-sm text-slate-500">Gastos</p><p className="mt-2 text-2xl font-bold text-rose-600">{brl(saidas)}</p></PanelCard>
        <PanelCard><p className="text-sm text-slate-500">Lucro</p><p className="mt-2 text-2xl font-bold text-blue-600">{brl(entradas - saidas)}</p></PanelCard>
      </div>

      <PanelCard>
        <form className="grid gap-4 lg:grid-cols-5">
          <Field label="Tipo"><select className={inputClass}><option>entrada</option><option>saida</option></select></Field>
          <Field label="Descricao"><input className={inputClass} placeholder="Descricao" /></Field>
          <Field label="Categoria"><input className={inputClass} placeholder="Categoria" /></Field>
          <Field label="Valor"><input className={inputClass} type="number" placeholder="0,00" /></Field>
          <Field label="Data"><input className={inputClass} type="date" /></Field>
          <Field label="Forma de pagamento"><select className={inputClass}><option>Pix</option><option>Cartao</option><option>Boleto</option><option>Transferencia</option></select></Field>
          <Field label="Lead"><input className={inputClass} placeholder="Opcional" /></Field>
          <Field label="Projeto"><input className={inputClass} placeholder="Opcional" /></Field>
        </form>
      </PanelCard>

      <PanelCard>
        <h3 className="text-lg font-bold">Relatorio simples</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="p-3">Descricao</th><th className="p-3">Tipo</th><th className="p-3">Categoria</th><th className="p-3">Data</th><th className="p-3">Pagamento</th><th className="p-3">Vinculo</th><th className="p-3 text-right">Valor</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{financeEntries.map((item) => <tr key={item.id}><td className="p-3 font-semibold">{item.descricao}</td><td className="p-3"><Pill tone={item.tipo === "entrada" ? "emerald" : "rose"}>{item.tipo}</Pill></td><td className="p-3">{item.categoria}</td><td className="p-3">{item.data}</td><td className="p-3">{item.formaPagamento}</td><td className="p-3 text-slate-500">{item.lead || item.projeto || "Sem vinculo"}</td><td className="p-3 text-right font-bold">{brl(item.valor)}</td></tr>)}</tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  )
}
