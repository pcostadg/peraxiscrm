 "use client"

import { LogOut, MoonStar, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { logoutAction } from "@/app/login/actions"
import { MobileMenu } from "@/components/layout/mobile-menu"
import type { SessionUser } from "@/types/crm"

export function Topbar({ user }: { user: SessionUser }) {
  const { resolvedTheme, setTheme } = useTheme()

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

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-600 sm:px-3">
          {resolvedTheme === "dark" ? <MoonStar size={16} /> : <Sun size={16} />}
          <select
            value={resolvedTheme === "dark" ? "dark" : "light"}
            onChange={(event) => setTheme(event.target.value)}
            className="max-w-20 bg-transparent text-sm outline-none sm:max-w-none"
            aria-label="Tema"
          >
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </label>

        <form action={logoutAction}>
          <button type="submit" className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-100" title="Sair">
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </header>
  )
}
