import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ROUTES } from "@/config/routes"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">Erro 404</p>
        <h1 className="mt-4 text-3xl font-bold text-slate-950">Página não encontrada</h1>
        <p className="mt-3 text-slate-500">O endereço informado não existe ou foi alterado.</p>
        <Link href={ROUTES.HOME} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
          <ArrowLeft size={18} />
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
