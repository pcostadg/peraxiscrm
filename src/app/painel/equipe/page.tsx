import { requireAuth } from "@/lib/auth"
import { EquipeView, type AppUserRecord } from "@/modules/equipe/equipe-view"
import { listAppUsers } from "@/services/crm-repository"
import type { TeamMember } from "@/types/crm"

function isAppUserRecord(value: unknown): value is AppUserRecord {
  return typeof value === "object" && value !== null && "name" in value && "phone" in value
}

function appUserFromTeamMember(member: TeamMember): AppUserRecord {
  return {
    id: member.id,
    name: member.nome,
    email: member.email,
    phone: member.telefone,
    role: member.role,
    status: member.status,
  }
}

export default async function EquipePage() {
  const user = await requireAuth("admin")
  const dbUsers = await listAppUsers()
  const normalized = Array.isArray(dbUsers)
    ? dbUsers.map((item) => (isAppUserRecord(item) ? item : appUserFromTeamMember(item as TeamMember)))
    : []
  return <EquipeView user={user} dbUsers={normalized} />
}
