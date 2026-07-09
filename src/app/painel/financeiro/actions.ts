"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { ROUTES } from "@/config/routes"
import { createClient, requireUser } from "@/lib/supabase/server"

const schema = z.object({ description: z.string().trim().min(2).max(180), type: z.enum(["receita", "despesa"]), category: z.preprocess((v) => v === "" ? null : v, z.string().trim().max(80).nullable()), amount: z.coerce.number().positive(), due_date: z.iso.date() })

export async function createFinanceEntry(formData: FormData) {
  const user = await requireUser(); const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!user || !parsed.success) throw new Error("Lançamento inválido.")
  const supabase = await createClient(); const { error } = await supabase.from("finance_entries").insert({ ...parsed.data, user_id: user.id })
  if (error) throw new Error("Não foi possível salvar o lançamento.")
  revalidatePath(ROUTES.FINANCEIRO); revalidatePath(ROUTES.DASHBOARD)
}
export async function toggleFinanceEntry(id: string, formData: FormData) {
  const user = await requireUser(); if (!user || !z.uuid().safeParse(id).success) throw new Error("Não autorizado.")
  const supabase = await createClient(); const { error } = await supabase.from("finance_entries").update({ paid: formData.get("paid") === "true" }).eq("id", id).eq("user_id", user.id)
  if (error) throw new Error("Não foi possível atualizar.")
  revalidatePath(ROUTES.FINANCEIRO); revalidatePath(ROUTES.DASHBOARD)
}
export async function deleteFinanceEntry(id: string) {
  const user = await requireUser(); if (!user || !z.uuid().safeParse(id).success) throw new Error("Não autorizado.")
  const supabase = await createClient(); const { error } = await supabase.from("finance_entries").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error("Não foi possível excluir.")
  revalidatePath(ROUTES.FINANCEIRO); revalidatePath(ROUTES.DASHBOARD)
}
