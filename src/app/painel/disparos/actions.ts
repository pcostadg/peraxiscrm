"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { ROUTES } from "@/config/routes"
import { createClient, requireUser } from "@/lib/supabase/server"
export async function createCampaign(formData:FormData){const user=await requireUser();const parsed=z.object({name:z.string().trim().min(2).max(120),template_name:z.preprocess(v=>v===""?null:v,z.string().trim().max(120).nullable()),scheduled_at:z.preprocess(v=>v===""?null:v,z.string().datetime({local:true}).nullable())}).safeParse(Object.fromEntries(formData));if(!user||!parsed.success)throw new Error("Campanha inválida.");const supabase=await createClient();const{error}=await supabase.from("campaigns").insert({...parsed.data,user_id:user.id,status:parsed.data.scheduled_at?"agendada":"rascunho"});if(error)throw new Error("Não foi possível criar a campanha.");revalidatePath(ROUTES.DISPAROS);revalidatePath(ROUTES.DASHBOARD)}
export async function deleteCampaign(id:string){const user=await requireUser();if(!user||!z.uuid().safeParse(id).success)throw new Error("Não autorizado.");const supabase=await createClient();const{error}=await supabase.from("campaigns").delete().eq("id",id).eq("user_id",user.id);if(error)throw new Error("Não foi possível excluir.");revalidatePath(ROUTES.DISPAROS);revalidatePath(ROUTES.DASHBOARD)}
