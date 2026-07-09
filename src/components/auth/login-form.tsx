"use client"

import { useActionState } from "react"
import { Lock, UserRound } from "lucide-react"
import { loginAction } from "@/app/login/actions"

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined)

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="username" className="sr-only">Login</label>
        <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
          <UserRound size={18} className="text-slate-400" />
          <input id="username" name="username" autoComplete="username" required placeholder="Login" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="sr-only">Senha</label>
        <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
          <Lock size={18} className="text-slate-400" />
          <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Senha" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </div>
      </div>

      {state?.error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <button type="submit" disabled={pending} className="h-14 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/25 disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "Entrando" : "Entrar"}
      </button>
    </form>
  )
}
