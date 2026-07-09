import { BellRing, MessageCircle } from "lucide-react"
import { brl, paymentNotifications } from "@/modules/shared/data"
import { buttonClass, ModuleHeader, PanelCard, Pill } from "@/modules/shared/components"

export function NotificarView() {
  return (
    <div className="space-y-6">
      <ModuleHeader icon={BellRing} title="Notificar" description="Clientes atrasados ou proximos do pagamento com acao direta pelo WhatsApp." />

      <div className="grid gap-4 lg:grid-cols-2">
        {paymentNotifications.map((item) => (
          <PanelCard key={item.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-bold">{item.cliente}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.telefone} · vencimento {item.vencimento}</p>
              </div>
              <Pill tone={item.status === "atrasado" ? "rose" : "amber"}>{item.status}</Pill>
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-sm text-slate-500">Valor</p>
              <p className="mt-1 text-2xl font-bold">{brl(item.valor)}</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.mensagem}</p>
            </div>
            <a className={`${buttonClass} mt-5 w-full`} href={`https://wa.me/${item.telefone}?text=${encodeURIComponent(item.mensagem)}`} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> Notificar no WhatsApp
            </a>
          </PanelCard>
        ))}
      </div>
    </div>
  )
}
