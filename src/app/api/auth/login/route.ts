import { NextResponse } from "next/server"
import { signInAdmin } from "@/lib/auth"
import { signJwt } from "@/lib/jwt"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null
  const user = body ? await signInAdmin(body.username ?? "", body.password ?? "") : null
  if (!user) return NextResponse.json({ error: "Usuario ou senha invalidos." }, { status: 401 })
  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
    accessToken: signJwt(user, "access"),
    refreshToken: signJwt(user, "refresh"),
  })
}
