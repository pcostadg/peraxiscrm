import { redirect } from "next/navigation"
import { getDefaultPanelRoute, requireAuth } from "@/lib/auth"

export default async function PainelPage() {
  const user = await requireAuth()
  redirect(getDefaultPanelRoute(user.role))
}
