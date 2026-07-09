import { NextResponse } from "next/server"
import { signJwt, verifyJwt } from "@/lib/jwt"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { refreshToken?: string } | null
  const payload = verifyJwt(body?.refreshToken, "refresh")
  if (!payload) return NextResponse.json({ error: "Refresh token invalido." }, { status: 401 })

  const user = {
    id: payload.id,
    name: payload.name,
    username: payload.username,
    email: payload.email,
    role: payload.role,
  }

  return NextResponse.json({
    tokenType: "Bearer",
    accessToken: signJwt(user, "access"),
    refreshToken: signJwt(user, "refresh"),
    expiresIn: 900,
  })
}
