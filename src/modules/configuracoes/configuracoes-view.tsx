import Image from "next/image"
import { Lock, Settings } from "lucide-react"
import { Field, inputClass, ModuleHeader, PanelCard } from "@/modules/shared/components"
import type { SessionUser } from "@/types/crm"

export function ConfiguracoesView({ user }: { user: SessionUser }) {
  return (
    <div className="space-y-6">
      <ModuleHeader icon={Settings} title="Configuracoes" description="Senha, logo e preferencias do ambiente." />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <PanelCard>
          <div className="flex items-center gap-3"><Lock className="text-blue-600" /><h3 className="font-bold">Senhas</h3></div>
          <div className="mt-5 space-y-4">
            <Field label="Senha atual"><input className={inputClass} type="password" /></Field>
            <Field label="Nova senha"><input className={inputClass} type="password" /></Field>
            {user.role === "admin" && <Field label="Alterar senha de funcionario"><select className={inputClass}><option>Selecionar usuario</option><option>Ana Paula</option><option>Carlos Nunes</option></select></Field>}
          </div>
        </PanelCard>

        <PanelCard>
          <div className="flex items-center gap-3"><Image src="/logo.png" alt="Peraxis" width={36} height={36} className="rounded-xl bg-white p-1" /><h3 className="font-bold">Identidade visual</h3></div>
          <div className="mt-5 rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_100%)] p-5">
            <p className="text-sm text-slate-500">O seletor de tema agora fica na topbar geral do sistema. Aqui mantemos apenas ajustes de acesso e identidade.</p>
            <div className="mt-5 flex justify-center rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm">
              <Image src="/logo.png" alt="Peraxis" width={180} height={64} className="h-auto w-[180px]" />
            </div>
          </div>
        </PanelCard>
      </div>
    </div>
  )
}
