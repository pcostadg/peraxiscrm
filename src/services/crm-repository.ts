import "server-only"

import type { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import {
  agents,
  chatMessages,
  companySettings,
  conversations,
  dispatchReports,
  financeEntries,
  leads,
  paymentNotifications,
  projectColumns,
  projects,
  recurringClients,
  teamMembers,
} from "@/modules/shared/data"

export type CrmModule = "conversas" | "leads" | "projetos" | "disparos" | "recorrentes" | "notificar" | "financeiro" | "agentes" | "equipe" | "configuracoes"

export type CrmRecord = {
  id: string
  module: CrmModule
  title: string
  status: string | null
  data: Record<string, unknown>
  created_at: string | Date
  updated_at: string | Date
}

const fallbackData = {
  conversas: { conversations, messages: chatMessages },
  leads,
  projetos: { columns: projectColumns, projects },
  disparos: dispatchReports,
  recorrentes: recurringClients,
  notificar: paymentNotifications,
  financeiro: financeEntries,
  agentes: agents,
  equipe: teamMembers,
  configuracoes: companySettings,
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

function isDatabaseFallbackError(error: unknown) {
  if (!(error instanceof Error)) return false

  return [
    "PrismaClientInitializationError",
    "Can't reach database server",
    "tenant/user",
    "ENOTFOUND",
    "ECONNREFUSED",
    "Error querying the database",
  ].some((snippet) => error.name.includes(snippet) || error.message.includes(snippet))
}

export async function listCrmRecords(module: CrmModule) {
  try {
    const data = await prisma.crmRecord.findMany({
      where: { module },
      orderBy: { createdAt: "desc" },
    })

    return data.map((record) => ({
      id: record.id,
      module: record.module as CrmModule,
      title: record.title,
      status: record.status,
      data: record.data as Record<string, unknown>,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    })) satisfies CrmRecord[]
  } catch (error) {
    if (!isDatabaseFallbackError(error)) {
      console.error(`Prisma ${module} list error`, error)
    }
    return fallbackData[module]
  }
}

export async function createCrmRecord(module: CrmModule, payload: Record<string, unknown>) {
  const title = String(payload.title ?? payload.nome ?? payload.name ?? module)
  const status = typeof payload.status === "string" ? payload.status : null
  const data = await prisma.crmRecord.create({
    data: { module, title, status, data: payload as Prisma.InputJsonValue },
  })

  return {
    id: data.id,
    module: data.module as CrmModule,
    title: data.title,
    status: data.status,
    data: data.data as Record<string, unknown>,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
  } satisfies CrmRecord
}

export async function updateCrmRecord(module: CrmModule, id: string, payload: Record<string, unknown>) {
  const title = String(payload.title ?? payload.nome ?? payload.name ?? module)
  const status = typeof payload.status === "string" ? payload.status : null
  const data = await prisma.crmRecord.update({
    where: { id },
    data: { title, status, data: payload as Prisma.InputJsonValue },
  })

  return {
    id: data.id,
    module: data.module as CrmModule,
    title: data.title,
    status: data.status,
    data: data.data as Record<string, unknown>,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
  } satisfies CrmRecord
}

export async function upsertCrmRecordById(module: CrmModule, id: string, payload: Record<string, unknown>) {
  const title = String(payload.title ?? payload.nome ?? payload.name ?? module)
  const status = typeof payload.status === "string" ? payload.status : null
  const data = await prisma.crmRecord.upsert({
    where: { id },
    create: { id, module, title, status, data: payload as Prisma.InputJsonValue },
    update: { module, title, status, data: payload as Prisma.InputJsonValue },
  })

  return {
    id: data.id,
    module: data.module as CrmModule,
    title: data.title,
    status: data.status,
    data: data.data as Record<string, unknown>,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
  } satisfies CrmRecord
}

export async function deleteCrmRecord(module: CrmModule, id: string) {
  const record = await prisma.crmRecord.findUnique({ where: { id }, select: { module: true } })
  if (!record || record.module !== module) throw new Error("Registro nao encontrado.")
  return prisma.crmRecord.delete({ where: { id } })
}

export async function listAppUsers() {
  try {
    return await prisma.appUser.findMany({
      select: { id: true, name: true, username: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "asc" },
    })
  } catch (error) {
    if (!isDatabaseFallbackError(error)) {
      console.error("Prisma users list error", error)
    }
    return teamMembers
  }
}

export async function createAppUser(payload: {
  name: string
  email: string
  phone?: string
  cargo?: string
  role: "admin" | "funcionario"
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
  payload: { name: string; email: string; phone?: string; role: "admin" | "funcionario"; status: "ativo" | "inativo" },
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
