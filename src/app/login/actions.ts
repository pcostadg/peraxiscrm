"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { ROUTES } from "@/config/routes"
import { getDefaultPanelRoute, signInAdmin, signOut } from "@/lib/auth"

const loginSchema = z.object({
  username: z.string().trim().min(2, "Informe o usuario."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
})

export type LoginState = { error?: string } | undefined

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const user = await signInAdmin(parsed.data.username, parsed.data.password)

  if (!user) return { error: "Usuario ou senha invalidos." }

  redirect(getDefaultPanelRoute(user.role))
}

export async function logoutAction() {
  await signOut()
  redirect(ROUTES.LOGIN)
}
