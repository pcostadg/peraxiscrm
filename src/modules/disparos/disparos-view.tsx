import { FileSpreadsheet, Rocket, Upload } from "lucide-react"
import { dispatchReports } from "@/modules/shared/data"
import { buttonClass, Field, inputClass, ModuleHeader, PanelCard, Pill, textareaClass } from "@/modules/shared/components"
import { parsePhoneList } from "@/services/validators"

const sample = "5511978140022\n5511999999999\n11999999999"
const parsed = parsePhoneList(sample)

export function DisparosView() {
  return (
    <div className="space-y-6">
      <ModuleHeader icon={Rocket} title="Disparos" description="Envio livre, unitario, em massa e por templates Meta sem expor token no frontend." />

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <PanelCard>
          <h3 className="text-lg font-bold">Criar disparo</h3>
          <form className="mt-5 grid gap-4 lg:grid-cols-2">
            <Field label="Tipo"><select className={inputClass}><option>Disparo livre</option><option>Template Meta</option><option>Envio unitario</option><option>Envio em massa</option></select></Field>
            <Field label="Template"><input className={inputClass} placeholder="nome_template_meta" /></Field>
            <Field label="Link da midia do template"><input className={inputClass} type="url" placeholder="https://..." /></Field>
            <Field label="Arquivo Excel/CSV"><input className={inputClass} type="file" accept=".csv,.xlsx,.xls" /></Field>
            <div className="lg:col-span-2"><Field label="Cadastrar numeros do disparo"><textarea className={textareaClass} defaultValue={sample} placeholder="5511978140022&#10;5511999999999" /></Field></div>
            <div className="lg:col-span-2"><Field label="Mensagem"><textarea className={textareaClass} placeholder="Mensagem livre ou parametros do template" /></Field></div>
            <button className={buttonClass}><Upload size={18} /> Preparar envio backend</button>
          </form>
        </PanelCard>

        <PanelCard>
          <h3 className="text-lg font-bold">Validacao de numeros</h3>
          <p className="mt-2 text-sm text-slate-500">Cada numero importado cria ou atualiza um lead automaticamente.</p>
          <div className="mt-5 space-y-2">
            {parsed.map((item) => <div key={item.phone} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950"><span>{item.phone}</span><Pill tone={item.valid ? "emerald" : "rose"}>{item.valid ? "valido" : "invalido"}</Pill></div>)}
          </div>
        </PanelCard>
      </div>

      <PanelCard>
        <div className="flex items-center gap-2"><FileSpreadsheet className="text-blue-600" /><h3 className="text-lg font-bold">Relatorio detalhado</h3></div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="p-3">Campanha</th><th className="p-3">Tipo</th><th className="p-3">Total</th><th className="p-3">Enviado</th><th className="p-3">Entregue</th><th className="p-3">Lido</th><th className="p-3">Falha</th><th className="p-3">Motivo</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{dispatchReports.map((item) => <tr key={item.id}><td className="p-3 font-semibold">{item.nome}</td><td className="p-3">{item.tipo}</td><td className="p-3">{item.total}</td><td className="p-3">{item.enviado}</td><td className="p-3">{item.entregue}</td><td className="p-3">{item.lido}</td><td className="p-3 text-rose-600">{item.falha}</td><td className="p-3 text-slate-500">{item.motivoFalha}</td></tr>)}</tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  )
}
