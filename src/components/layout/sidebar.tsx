"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  BellRing,
  LayoutDashboard,
  MessageCircle,
  ListTodo,
  Repeat2,
  Settings,
  Users,
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

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const items = menu.filter((item) => !item.adminOnly || user.role === "admin")

  return (
    <aside
      className={`sticky top-0 hidden h-screen flex-col border-r border-slate-200/80 bg-white/95 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur transition-all duration-300 lg:flex ${
        collapsed ? "w-24" : "w-72"
      }`}
    >
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5">
        {!collapsed && (
          <Image
            src="/logo.png"
            alt="Peraxis"
            width={170}
            height={60}
            className="h-auto w-[170px]"
            priority
          />
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-4">
        {items.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-600 hover:bg-slate-100"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-blue-600" size={22} />

            {!collapsed && (
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500">
                  {user.role === "admin" ? "Admin" : "Funcionario"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
