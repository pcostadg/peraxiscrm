import Image from "next/image"
import { Lock, Moon, Settings, Shield } from "lucide-react"
import { companySettings } from "@/modules/shared/data"
import { Field, inputClass, ModuleHeader, PanelCard, Pill } from "@/modules/shared/components"
import type { SessionUser } from "@/types/crm"

export function ConfiguracoesView({ user }: { user: SessionUser }) {
  return (
    <div className="space-y-6">
      <ModuleHeader icon={Settings} title="Configuracoes" description="Senha, tema, empresa, dominio, logo e seguranca." />

      <div className="grid gap-4 xl:grid-cols-3">
        <PanelCard>
          <div className="flex items-center gap-3"><Lock className="text-blue-600" /><h3 className="font-bold">Senhas</h3></div>
          <div className="mt-5 space-y-4">
            <Field label="Senha atual"><input className={inputClass} type="password" /></Field>
            <Field label="Nova senha"><input className={inputClass} type="password" /></Field>
            {user.role === "admin" && <Field label="Alterar senha de funcionario"><select className={inputClass}><option>Selecionar usuario</option><option>Ana Paula</option><option>Carlos Nunes</option></select></Field>}
          </div>
        </PanelCard>

        <PanelCard>
          <div className="flex items-center gap-3"><Moon className="text-blue-600" /><h3 className="font-bold">Aparencia</h3></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">Claro</button>
            <button className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm font-semibold text-white">Escuro</button>
          </div>
          <p className="mt-4 text-sm text-slate-500">Theme provider ja preparado para alternancia futura.</p>
        </PanelCard>

        <PanelCard>
          <div className="flex items-center gap-3"><Shield className="text-blue-600" /><h3 className="font-bold">Seguranca</h3></div>
          <div className="mt-5 space-y-3">
            <Pill tone="emerald">Cookies HTTP-only</Pill>
            <Pill tone="blue">Tokens apenas backend</Pill>
            <Pill tone="violet">Vercel Free ready</Pill>
          </div>
        </PanelCard>
      </div>

      <PanelCard>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <Image src="/logo.png" alt="Peraxis" width={180} height={64} className="h-auto w-[180px] rounded-xl bg-white p-2" />
          <div className="grid flex-1 gap-4 lg:grid-cols-3">
            <Field label="Nome da empresa"><input className={inputClass} defaultValue={companySettings.nome} /></Field>
            <Field label="Dominio"><input className={inputClass} defaultValue={companySettings.dominio} /></Field>
            <Field label="Dados basicos"><input className={inputClass} defaultValue={companySettings.dados} /></Field>
          </div>
        </div>
      </PanelCard>
    </div>
  )
}
