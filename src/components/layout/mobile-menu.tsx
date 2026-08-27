"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Bot,
  BriefcaseBusiness,
  Building2,
  BellRing,
  CreditCard,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageCircle,
  Repeat2,
  Settings,
  Users,
  X,
} from "lucide-react"
import { ROUTES } from "@/config/routes"
import type { NavItem, SessionUser } from "@/types/crm"

const menu: NavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: "Conversas", href: ROUTES.CONVERSAS, icon: MessageCircle },
  { label: "Leads", href: ROUTES.LEADS, icon: Users },
  { label: "Projetos", href: ROUTES.PROJETOS, icon: BriefcaseBusiness },
  { label: "Tarefas", href: ROUTES.TAREFAS, icon: ListTodo },
  { label: "Faturas", href: ROUTES.RECORRENTES, icon: Repeat2 },
  { label: "Notificar", href: ROUTES.NOTIFICAR, icon: BellRing },
  { label: "Financeiro", href: ROUTES.FINANCEIRO, icon: CreditCard },
  { label: "Agentes", href: ROUTES.AGENTES, icon: Bot },
  { label: "Equipe", href: ROUTES.EQUIPE, icon: Building2, adminOnly: true },
  { label: "Configurações", href: ROUTES.CONFIGURACOES, icon: Settings },
]

export function MobileMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const items = menu.filter((item) => !item.adminOnly || user.role === "admin")

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />

          <aside className="relative z-10 h-dvh w-[min(85vw,320px)] overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)]">
            <div className="mb-8 flex items-center justify-between">
              <Image
                src="/logo.png"
                alt="Peraxis"
                width={150}
                height={50}
                className="h-auto w-[150px]"
                priority
              />

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600"
                aria-label="Fechar menu"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="space-y-2 pb-6">
              {items.map((item) => {
                const Icon = item.icon
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </aside>
        </div>
      )}
    </div>
  )
}
