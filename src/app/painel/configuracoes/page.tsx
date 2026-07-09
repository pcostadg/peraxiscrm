import { requireAuth } from "@/lib/auth"
import { ConfiguracoesView } from "@/modules/configuracoes/configuracoes-view"

export default async function ConfiguracoesPage() {
  const user = await requireAuth()
  return <ConfiguracoesView user={user} />
}
