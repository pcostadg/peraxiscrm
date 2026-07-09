import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import type { SessionUser } from "@/types/crm"

export type JwtPayload = SessionUser & {
  type: "access" | "refresh"
  iat: number
  exp: number
}

function secret() {
  return process.env.JWT_SECRET || process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "peraxis-local-dev-secret"
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

function decode<T>(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T
}

function signature(input: string) {
  return createHmac("sha256", secret()).update(input).digest("base64url")
}

export function signJwt(user: SessionUser, type: "access" | "refresh" = "access") {
  const now = Math.floor(Date.now() / 1000)
  const ttl = type === "access" ? 60 * 15 : 60 * 60 * 24 * 7
  const header = encode({ alg: "HS256", typ: "JWT" })
  const payload = encode({ ...user, type, iat: now, exp: now + ttl } satisfies JwtPayload)
  const input = `${header}.${payload}`
  return `${input}.${signature(input)}`
}

export function verifyJwt(token?: string, expectedType?: "access" | "refresh") {
  if (!token) return null
  const [header, payload, received] = token.split(".")
  if (!header || !payload || !received) return null

  const input = `${header}.${payload}`
  const expected = signature(input)
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null

  try {
    const parsed = decode<JwtPayload>(payload)
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null
    if (expectedType && parsed.type !== expectedType) return null
    return parsed
  } catch {
    return null
  }
}

export function bearerToken(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) return undefined
  return authorization.slice("Bearer ".length).trim()
}
