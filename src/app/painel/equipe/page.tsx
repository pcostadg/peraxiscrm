import { requireAuth } from "@/lib/auth"
import { EquipeView, type AppUserRecord } from "@/modules/equipe/equipe-view"
import { listAppUsers } from "@/services/crm-repository"

export default async function EquipePage() {
  const user = await requireAuth("admin")
  const dbUsers = await listAppUsers()
  const normalized: AppUserRecord[] = dbUsers.map((record) => ({
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    role: record.role as AppUserRecord["role"],
    status: record.status as AppUserRecord["status"],
  }))
  return <EquipeView user={user} dbUsers={normalized} />
}
