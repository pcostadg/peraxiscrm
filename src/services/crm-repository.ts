import "server-only"

import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { UserRole } from "@/types/crm"

export type CrmModule = "conversas" | "leads" | "projetos" | "disparos" | "recorrentes" | "notificar" | "financeiro" | "agentes" | "equipe" | "configuracoes"

export type CrmRecord = {
  id: string
  module: CrmModule
  title: string
  status: string | null
  owner_user_id: string | null
  data: Record<string, unknown>
  created_at: string | Date
  updated_at: string | Date
}

export type AppUserListRecord = {
  id: string
  name: string
  username: string
  email: string
  phone: string | null
  role: UserRole
  status: "ativo" | "inativo"
  createdAt: Date
  updatedAt: Date
}

function slugifyUsername(value: string) {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")

  return base || `usuario.${Date.now()}`
}

function formatRepositoryError(action: string, error: unknown) {
  if (error instanceof Error) {
    return new Error(`Falha ao ${action}: ${error.message}`)
  }
  return new Error(`Falha ao ${action}.`)
}

type JsonCompatibleValue =
  | string
  | number
  | boolean
  | null
  | JsonCompatibleValue[]
  | { [key: string]: JsonCompatibleValue }

function sanitizeJsonValue(value: unknown): JsonCompatibleValue {
  if (value === null) return null
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value
  if (value instanceof Date) return value.toISOString()

  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "undefined" ? null : sanitizeJsonValue(item)))
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).flatMap(([key, item]) => (
      typeof item === "undefined" ? [] : [[key, sanitizeJsonValue(item)] as const]
    ))

    return Object.fromEntries(entries)
  }

  return String(value)
}

export async function listCrmRecords(module: CrmModule, ownerUserId?: string) {
  try {
    const data = await prisma.crmRecord.findMany({
      where: {
        module,
        ...(ownerUserId ? { ownerUserId } : {}),
      },
      orderBy: { createdAt: "desc" },
    })

    return data.map((record) => ({
      id: record.id,
      module: record.module as CrmModule,
      title: record.title,
      status: record.status,
      owner_user_id: record.ownerUserId,
      data: record.data as Record<string, unknown>,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    })) satisfies CrmRecord[]
  } catch (error) {
    console.error(`Prisma ${module} list error`, error)
    throw formatRepositoryError(`listar registros de ${module}`, error)
  }
}

export async function createCrmRecord(module: CrmModule, payload: Record<string, unknown>, ownerUserId?: string) {
  const title = String(payload.title ?? payload.nome ?? payload.name ?? module)
  const status = typeof payload.status === "string" ? payload.status : null
  const id = typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : randomUUID()
  const normalizedPayload = sanitizeJsonValue(payload) as Prisma.InputJsonValue
  try {
    const data = await prisma.crmRecord.create({
      data: {
        id,
        module,
        title,
        status,
        ownerUserId: ownerUserId ?? null,
        data: normalizedPayload,
      },
    })

    return {
      id: data.id,
      module: data.module as CrmModule,
      title: data.title,
      status: data.status,
      owner_user_id: data.ownerUserId,
      data: data.data as Record<string, unknown>,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    } satisfies CrmRecord
  } catch (error) {
    console.error(`Prisma ${module} create error`, error)
    throw formatRepositoryError(`criar registro de ${module}`, error)
  }
}

export async function updateCrmRecord(module: CrmModule, id: string, payload: Record<string, unknown>, ownerUserId?: string) {
  const title = String(payload.title ?? payload.nome ?? payload.name ?? module)
  const status = typeof payload.status === "string" ? payload.status : null
  const normalizedPayload = sanitizeJsonValue(payload) as Prisma.InputJsonValue
  try {
    const record = await prisma.crmRecord.findUnique({
      where: { id },
      select: { module: true, ownerUserId: true },
    })
    if (!record || record.module !== module || (ownerUserId && record.ownerUserId !== ownerUserId)) {
      throw new Error("Registro nao encontrado.")
    }

    const data = await prisma.crmRecord.update({
      where: { id },
      data: { title, status, data: normalizedPayload },
    })

    return {
      id: data.id,
      module: data.module as CrmModule,
      title: data.title,
      status: data.status,
      owner_user_id: data.ownerUserId,
      data: data.data as Record<string, unknown>,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    } satisfies CrmRecord
  } catch (error) {
    console.error(`Prisma ${module} update error`, error)
    throw formatRepositoryError(`atualizar registro de ${module}`, error)
  }
}

export async function upsertCrmRecordById(module: CrmModule, id: string, payload: Record<string, unknown>, ownerUserId?: string) {
  const title = String(payload.title ?? payload.nome ?? payload.name ?? module)
  const status = typeof payload.status === "string" ? payload.status : null
  const normalizedPayload = sanitizeJsonValue(payload) as Prisma.InputJsonValue
  try {
    const data = await prisma.crmRecord.upsert({
      where: { id },
      create: {
        id,
        module,
        title,
        status,
        ownerUserId: ownerUserId ?? null,
        data: normalizedPayload,
      },
      update: { module, title, status, data: normalizedPayload },
    })

    return {
      id: data.id,
      module: data.module as CrmModule,
      title: data.title,
      status: data.status,
      owner_user_id: data.ownerUserId,
      data: data.data as Record<string, unknown>,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    } satisfies CrmRecord
  } catch (error) {
    console.error(`Prisma ${module} upsert error`, error)
    throw formatRepositoryError(`salvar registro de ${module}`, error)
  }
}

export async function deleteCrmRecord(module: CrmModule, id: string, ownerUserId?: string) {
  const record = await prisma.crmRecord.findUnique({ where: { id }, select: { module: true, ownerUserId: true } })
  if (!record || record.module !== module || (ownerUserId && record.ownerUserId !== ownerUserId)) throw new Error("Registro nao encontrado.")
  return prisma.crmRecord.delete({ where: { id } })
}

export async function listAppUsers(): Promise<AppUserListRecord[]> {
  try {
    const records = await prisma.appUser.findMany({
      select: { id: true, name: true, username: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "asc" },
    })

    return records.map((record) => ({
      id: record.id,
      name: record.name,
      username: record.username,
      email: record.email,
      phone: record.phone,
      role: record.role as UserRole,
      status: record.status as AppUserListRecord["status"],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }))
  } catch (error) {
    console.error("Prisma users list error", error)
    throw formatRepositoryError("listar usuarios", error)
  }
}

export async function createAppUser(payload: {
  name: string
  email: string
  phone?: string
  cargo?: string
  role: UserRole
  status: "ativo" | "inativo"
}) {
  const usernameBase = slugifyUsername(payload.email || payload.name)
  let username = usernameBase
  let suffix = 1

  while (await prisma.appUser.findUnique({ where: { username }, select: { id: true } })) {
    username = `${usernameBase}.${suffix++}`
  }

  const passwordHash = await bcrypt.hash(process.env.DEFAULT_TEAM_USER_PASSWORD || "123456", 10)
  return prisma.appUser.create({
    data: {
      id: randomUUID(),
      name: payload.name,
      username,
      email: payload.email,
      phone: payload.phone || null,
      role: payload.role,
      status: payload.status,
      passwordHash,
    },
    select: { id: true, name: true, username: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true },
  })
}

export async function updateAppUser(
  id: string,
  payload: { name: string; email: string; phone?: string; role: UserRole; status: "ativo" | "inativo" },
) {
  return prisma.appUser.update({
    where: { id },
    data: {
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      role: payload.role,
      status: payload.status,
    },
    select: { id: true, name: true, username: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true },
  })
}

export async function deleteAppUser(id: string) {
  return prisma.appUser.delete({ where: { id } })
}

export async function findDefaultCrmOwnerId() {
  const user = await prisma.appUser.findFirst({
    where: { status: "ativo" },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  })

  return user?.id ?? null
}
