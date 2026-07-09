"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { ROUTES } from "@/config/routes"
import { createClient, requireUser } from "@/lib/supabase/server"

export async function createAgent(formData: FormData) {
  const user = await requireUser(); const parsed = z.object({ name: z.string().trim().min(2).max(100), instructions: z.string().trim().min(10).max(10000) }).safeParse(Object.fromEntries(formData)); if (!user || !parsed.success) throw new Error("Agente inválido.")
  const supabase = await createClient(); const { error } = await supabase.from("agents").insert({ ...parsed.data, user_id: user.id }); if (error) throw new Error("Não foi possível criar o agente."); revalidatePath(ROUTES.AGENTES)
}
export async function toggleAgent(id: string, formData: FormData) {
  const user = await requireUser(); if (!user || !z.uuid().safeParse(id).success) throw new Error("Não autorizado."); const supabase = await createClient(); const { error } = await supabase.from("agents").update({ active: formData.get("active") === "true" }).eq("id",id).eq("user_id",user.id); if (error) throw new Error("Não foi possível atualizar."); revalidatePath(ROUTES.AGENTES)
}
export async function deleteAgent(id: string) {
  const user = await requireUser(); if (!user || !z.uuid().safeParse(id).success) throw new Error("Não autorizado."); const supabase = await createClient(); const { error } = await supabase.from("agents").delete().eq("id",id).eq("user_id",user.id); if (error) throw new Error("Não foi possível excluir."); revalidatePath(ROUTES.AGENTES)
}
