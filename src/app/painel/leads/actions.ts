"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { ROUTES } from "@/config/routes"
import { createClient, requireUser } from "@/lib/supabase/server"

const optionalText = z.preprocess((value) => value === "" ? null : value, z.string().trim().max(5000).nullable())
const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.preprocess((value) => value === "" ? null : value, z.email().nullable()),
  phone: z.preprocess((value) => value === "" ? null : value, z.string().trim().max(30).nullable()),
  company: z.preprocess((value) => value === "" ? null : value, z.string().trim().max(120).nullable()),
  value: z.coerce.number().min(0).default(0),
  notes: optionalText,
})

const statusSchema = z.enum(["novo", "contato", "negociacao", "ganho", "perdido"])

async function authenticatedClient() {
  const user = await requireUser()
  if (!user) throw new Error("Não autorizado.")
  return { user, supabase: await createClient() }
}

export async function createLead(formData: FormData) {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Lead inválido.")

  const { user, supabase } = await authenticatedClient()
  const { error } = await supabase.from("leads").insert({ ...parsed.data, user_id: user.id })
  if (error) throw new Error("Não foi possível cadastrar o lead.")
  revalidatePath(ROUTES.LEADS)
  revalidatePath(ROUTES.DASHBOARD)
}

export async function updateLeadStatus(id: string, formData: FormData) {
  const status = statusSchema.safeParse(formData.get("status"))
  if (!z.uuid().safeParse(id).success || !status.success) throw new Error("Dados inválidos.")

  const { user, supabase } = await authenticatedClient()
  const { error } = await supabase.from("leads").update({ status: status.data }).eq("id", id).eq("user_id", user.id)
  if (error) throw new Error("Não foi possível atualizar o lead.")
  revalidatePath(ROUTES.LEADS)
  revalidatePath(ROUTES.DASHBOARD)
}

export async function deleteLead(id: string) {
  if (!z.uuid().safeParse(id).success) throw new Error("Lead inválido.")
  const { user, supabase } = await authenticatedClient()
  const { error } = await supabase.from("leads").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error("Não foi possível excluir o lead.")
  revalidatePath(ROUTES.LEADS)
  revalidatePath(ROUTES.DASHBOARD)
}
