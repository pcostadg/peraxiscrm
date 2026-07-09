import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { bearerToken, verifyJwt } from "@/lib/jwt"

export async function requireApiUser(request?: Request) {
  const tokenUser = request ? verifyJwt(bearerToken(request.headers.get("authorization")), "access") : null
  const user = tokenUser ?? await getCurrentUser()
  if (!user) return { user: null, response: NextResponse.json({ error: "Nao autenticado." }, { status: 401 }) }
  return { user, response: null }
}

export function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data })
}

export function accepted(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, message, ...extra })
}
