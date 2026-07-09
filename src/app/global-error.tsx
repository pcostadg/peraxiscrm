"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">Algo deu errado</p>
            <h1 className="mt-4 text-3xl font-bold text-slate-950">Não foi possível carregar esta página</h1>
            <p className="mt-3 text-slate-500">Tente novamente. Se o problema continuar, contate o suporte.</p>
            <button type="button" onClick={reset} className="mt-8 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Tentar novamente
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
