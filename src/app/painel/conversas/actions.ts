"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { ROUTES } from "@/config/routes"
import { createClient, requireUser } from "@/lib/supabase/server"
import { sendWhatsAppText } from "@/lib/meta/whatsapp"

const schema = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().min(8).max(30) })

export async function createConversation(formData: FormData) {
  const user = await requireUser(); const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!user || !parsed.success) throw new Error("Contato inválido.")
  const supabase = await createClient()
  const { data: contact, error: contactError } = await supabase.from("contacts").upsert({ ...parsed.data, user_id: user.id }, { onConflict: "user_id,phone" }).select("id").single()
  if (contactError || !contact) throw new Error("Não foi possível salvar o contato.")
  const { error } = await supabase.from("conversations").insert({ user_id: user.id, contact_id: contact.id })
  if (error) throw new Error("Não foi possível iniciar a conversa.")
  revalidatePath(ROUTES.CONVERSAS); revalidatePath(ROUTES.DASHBOARD)
}

export async function finishConversation(id: string) {
  const user = await requireUser(); if (!user || !z.uuid().safeParse(id).success) throw new Error("Não autorizado.")
  const supabase = await createClient(); const { error } = await supabase.from("conversations").update({ status: "finalizada" }).eq("id", id).eq("user_id", user.id)
  if (error) throw new Error("Não foi possível finalizar.")
  revalidatePath(ROUTES.CONVERSAS); revalidatePath(ROUTES.DASHBOARD)
}

export async function sendMessage(id: string, formData: FormData) {
  const user = await requireUser(); const body = z.string().trim().min(1).max(4096).safeParse(formData.get("message"))
  if (!user || !z.uuid().safeParse(id).success || !body.success) throw new Error("Mensagem inválida.")
  const supabase = await createClient()
  const { data: conversation } = await supabase.from("conversations").select("contact_id,contacts(phone)").eq("id",id).eq("user_id",user.id).single()
  const contact = conversation?.contacts as unknown as { phone: string } | null
  if (!contact?.phone) throw new Error("Contato sem telefone.")
  const result = await sendWhatsAppText(contact.phone, body.data)
  const { error } = await supabase.from("messages").insert({ user_id:user.id,conversation_id:id,direction:"saida",content:body.data,status:"enviado",meta_message_id:result.messages?.[0]?.id ?? null })
  if (error) throw new Error("Mensagem enviada, mas o histórico não foi salvo.")
  await supabase.from("conversations").update({last_message_at:new Date().toISOString(),status:"aberta"}).eq("id",id).eq("user_id",user.id)
  revalidatePath(ROUTES.CONVERSAS); revalidatePath(ROUTES.DASHBOARD)
}
