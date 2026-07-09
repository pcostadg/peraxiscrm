import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { requireAuth } from "@/lib/auth"

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] text-slate-950">
      <Sidebar user={user} />

      <main className="min-w-0 flex-1">
        <Topbar user={user} />

        <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-5 md:p-6 xl:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
