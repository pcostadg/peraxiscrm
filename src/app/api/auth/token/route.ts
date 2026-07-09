import { NextResponse } from "next/server"
import { signInAdmin } from "@/lib/auth"
import { signJwt } from "@/lib/jwt"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null
  const user = body ? await signInAdmin(body.username ?? "", body.password ?? "") : null
  if (!user) return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 })

  return NextResponse.json({
    tokenType: "Bearer",
    accessToken: signJwt(user, "access"),
    refreshToken: signJwt(user, "refresh"),
    expiresIn: 900,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
}
