import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, Plus } from "lucide-react"

type Metric = {
  label: string
  value: string
  detail: string
}

type ModuleOverviewProps = {
  title: string
  description: string
  icon: LucideIcon
  action: string
  metrics: Metric[]
  emptyTitle: string
  emptyDescription: string
}

export function ModuleOverview({
  title,
  description,
  icon: Icon,
  action,
  metrics,
  emptyTitle,
  emptyDescription,
}: ModuleOverviewProps) {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Icon size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-slate-500">{description}</p>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          {action}
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <ArrowUpRight size={18} className="text-slate-300" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-950">{metric.value}</p>
            <p className="mt-2 text-sm text-slate-400">{metric.detail}</p>
          </article>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon size={26} />
        </div>
        <h3 className="mt-5 text-lg font-bold text-slate-900">{emptyTitle}</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          {emptyDescription}
        </p>
      </div>
    </section>
  )
}
