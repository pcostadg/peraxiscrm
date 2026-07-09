import { LogOut, Search } from "lucide-react"
import { logoutAction } from "@/app/login/actions"
import { MobileMenu } from "@/components/layout/mobile-menu"
import type { SessionUser } from "@/types/crm"

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur sm:h-20 sm:px-6 xl:px-8">
      <div className="flex items-center gap-4">
        <MobileMenu user={user} />

        <div>
          <h1 className="text-base font-bold text-slate-900 sm:text-lg">
            Peraxis CRM
          </h1>
          <p className="hidden text-xs text-slate-500 sm:block">
            {user.name} · {user.role === "admin" ? "Administrador" : "Funcionario"}
          </p>
        </div>
      </div>

      <div className="hidden w-full max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex">
        <Search size={18} className="text-slate-400" />
        <input
          placeholder="Pesquisar no sistema..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <form action={logoutAction}>
        <button type="submit" className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-100" title="Sair">
          <LogOut size={18} />
        </button>
      </form>
    </header>
  )
}
