"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { ROUTES } from "@/config/routes"
import { createClient, requireUser } from "@/lib/supabase/server"

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.preprocess((v) => v === "" ? null : v, z.string().trim().max(5000).nullable()),
  due_date: z.preprocess((v) => v === "" ? null : v, z.iso.date().nullable()),
  budget: z.coerce.number().min(0),
})
const statusSchema = z.enum(["planejado", "em_andamento", "pausado", "concluido"])

export async function createProject(formData: FormData) {
  const user = await requireUser()
  if (!user) throw new Error("Não autorizado.")
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error("Dados do projeto inválidos.")
  const supabase = await createClient()
  const { error } = await supabase.from("projects").insert({ ...parsed.data, user_id: user.id })
  if (error) throw new Error("Não foi possível criar o projeto.")
  revalidatePath(ROUTES.PROJETOS); revalidatePath(ROUTES.DASHBOARD)
}

export async function updateProjectStatus(id: string, formData: FormData) {
  const user = await requireUser()
  const status = statusSchema.safeParse(formData.get("status"))
  if (!user || !z.uuid().safeParse(id).success || !status.success) throw new Error("Dados inválidos.")
  const supabase = await createClient()
  const { error } = await supabase.from("projects").update({ status: status.data }).eq("id", id).eq("user_id", user.id)
  if (error) throw new Error("Não foi possível atualizar o projeto.")
  revalidatePath(ROUTES.PROJETOS); revalidatePath(ROUTES.DASHBOARD)
}

export async function deleteProject(id: string) {
  const user = await requireUser()
  if (!user || !z.uuid().safeParse(id).success) throw new Error("Não autorizado.")
  const supabase = await createClient()
  const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error("Não foi possível excluir o projeto.")
  revalidatePath(ROUTES.PROJETOS); revalidatePath(ROUTES.DASHBOARD)
}
