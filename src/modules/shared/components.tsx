import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function ModuleHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <Icon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 lg:text-base">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export function PanelCard({
  children,
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-2xl border border-slate-200/80 bg-white/92 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur", className)}
      {...props}
    >
      {children}
    </section>
  )
}

export function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode
  tone?: "blue" | "emerald" | "amber" | "rose" | "violet" | "slate"
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  }

  return <span className={cn("inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>{children}</span>
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  )
}

export const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
export const textareaClass = "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
export const buttonClass = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
