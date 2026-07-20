import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ROUTES } from "@/config/routes"
import { prisma } from "@/lib/prisma"
import type { SessionUser, UserRole } from "@/types/crm"

const COOKIE_NAME = "peraxis_session"
const ROOT_USERNAME = "root"
const ROOT_PASSWORD = "roots2601"

const rootUser: SessionUser = {
  id: "root-admin",
  name: "Administrador",
  username: ROOT_USERNAME,
  email: "root@peraxis.local",
  role: "admin",
}

type SessionPayload = SessionUser & {
  iat: number
  exp: number
}

function getSecret() {
  return process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "peraxis-local-dev-secret"
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url")
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url")
}

function createToken(user: SessionUser) {
  const now = Math.floor(Date.now() / 1000)
  const payload = toBase64Url(JSON.stringify({ ...user, iat: now, exp: now + 60 * 60 * 12 }))
  return `${payload}.${sign(payload)}`
}

function verifyToken(token?: string): SessionUser | null {
  if (!token) return null
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null

  const expected = sign(payload)
  const receivedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as SessionPayload
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null
    return {
      id: parsed.id,
      name: parsed.name,
      username: parsed.username,
      email: parsed.email,
      role: parsed.role,
    }
  } catch {
    return null
  }
}

export function getDefaultPanelRoute(role: UserRole) {
  if (role === "tester") return ROUTES.TESTERS
  return ROUTES.DASHBOARD
}

export async function signInAdmin(username: string, password: string) {
  const supabaseUser = await signInSupabaseUser(username, password)
  if (supabaseUser) {
    const token = createToken(supabaseUser)
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    })
    return supabaseUser
  }

  if (username !== ROOT_USERNAME || password !== ROOT_PASSWORD) return null
  const token = createToken(rootUser)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  })
  return rootUser
}

async function signInSupabaseUser(usernameOrEmail: string, password: string) {
  const identifier = usernameOrEmail.trim()
  const data = await prisma.appUser.findFirst({
    where: {
      status: "ativo",
      OR: [
        { username: identifier },
        { email: identifier.toLowerCase() },
      ],
    },
    select: { id: true, name: true, username: true, email: true, role: true, passwordHash: true },
  }).catch(() => null)

  if (!data?.passwordHash) return null
  const valid = await bcrypt.compare(password, data.passwordHash)
  if (!valid) return null

  return {
    id: data.id,
    name: data.name,
    username: data.username,
    email: data.email,
    role: data.role as UserRole,
  } satisfies SessionUser
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  return verifyToken(cookieStore.get(COOKIE_NAME)?.value)
}

export async function requireAuth(role?: UserRole) {
  const user = await getCurrentUser()
  if (!user) redirect(ROUTES.LOGIN)
  if (role && user.role !== role) redirect(getDefaultPanelRoute(user.role))
  return user
}

export function getUserFromCookieValue(value?: string) {
  return verifyToken(value)
}

export { COOKIE_NAME }
