import "server-only"

import {
  WHATSAPP_BROADCAST_AUTO_PAUSE_FAILURES,
  WHATSAPP_BROADCAST_MAX_BATCH_SIZE,
  WHATSAPP_BROADCAST_MAX_DELAY_SECONDS,
  WHATSAPP_BROADCAST_MAX_PER_HOUR,
  WHATSAPP_BROADCAST_MIN_DELAY_SECONDS,
  WHATSAPP_BROADCAST_TOPIC,
} from "@/config/whatsapp-broadcast"
import type { CrmRecord } from "@/services/crm-repository"
import { getCrmRecordById, updateCrmRecord } from "@/services/crm-repository"
import { sendCrmMediaMessage, sendCrmTextMessage } from "@/services/crm-whatsapp"
import { checkEvolutionWhatsAppNumber } from "@/services/evolution"

export type WhatsappBroadcastMessage = {
  batchId: string
  dispatchRecordId: string
  userId: string
  to: string
  message?: string
  assignedTo?: string
  contactName?: string
  tagLabels?: string[]
}

export type WhatsappBroadcastRecipientStatus = {
  phone: string
  contactName?: string | null
  labels?: string[]
  status: "agendado" | "interrompido" | "auto_pausado" | "ignorado_duplicado" | "sem_whatsapp" | "enviado" | "falha_validacao" | "falha_envio"
  error?: string | null
  checkedAt?: string | null
  sentAt?: string | null
  scheduledFor?: string | null
}

export async function processWhatsappBroadcastMessage(message: WhatsappBroadcastMessage) {
  const checkedAt = new Date().toISOString()
  const dispatchRecord = await getCrmRecordById("disparos", message.dispatchRecordId)
  if (!dispatchRecord) {
    throw new Error("Registro do disparo nao encontrado.")
  }

  const dispatchData = dispatchRecord.data as Record<string, unknown>
  const sharedMessage = message.message ?? normalizeOptionalString(dispatchData.message)
  const sharedMedia = normalizeOptionalString(dispatchData.media)
  const sharedPreviewUrl = normalizeOptionalString(dispatchData.previewUrl)
  const sharedMimeType = normalizeOptionalString(dispatchData.mimeType)
  const sharedFileName = normalizeOptionalString(dispatchData.fileName)
  const sharedKind = normalizeMediaKind(dispatchData.kind)

  const currentDispatchStatus = String(dispatchData.status ?? "").trim()
  if (currentDispatchStatus === "interrompido" || currentDispatchStatus === "auto_pausado") {
    await patchDispatchRecipient(message, {
      status: currentDispatchStatus === "interrompido" ? "interrompido" : "auto_pausado",
      checkedAt,
      error:
        currentDispatchStatus === "interrompido"
          ? "Agendamento interrompido manualmente."
          : "Agendamento pausado automaticamente por excesso de falhas.",
    })
    return { status: currentDispatchStatus === "interrompido" ? ("interrompido" as const) : ("auto_pausado" as const) }
  }

  try {
    const check = await checkEvolutionWhatsAppNumber(message.to)
    if (!check.exists) {
      await patchDispatchRecipient(message, {
        status: "sem_whatsapp",
        checkedAt,
        error: "Numero sem WhatsApp ativo.",
      })
      return { status: "sem_whatsapp" as const }
    }
  } catch (error) {
    await patchDispatchRecipient(message, {
      status: "falha_validacao",
      checkedAt,
      error: error instanceof Error ? error.message : "Falha ao validar numero na Evolution API.",
    })
    return { status: "falha_validacao" as const }
  }

  if (sharedMedia && sharedKind) {
    try {
      await sendCrmMediaMessage({
        userId: message.userId,
        to: message.to,
        media: sharedMedia,
        kind: sharedKind,
        message: sharedMessage,
        previewUrl: sharedPreviewUrl,
        mimeType: sharedMimeType,
        fileName: sharedFileName,
        contactName: message.contactName,
        assignedTo: message.assignedTo,
        tagLabels: message.tagLabels,
      })
      await patchDispatchRecipient(message, {
        status: "enviado",
        checkedAt,
        sentAt: new Date().toISOString(),
        error: null,
      })
      return { status: "enviado" as const }
    } catch (error) {
      await patchDispatchRecipient(message, {
        status: "falha_envio",
        checkedAt,
        error: error instanceof Error ? error.message : "Falha ao enviar midia.",
      })
      throw error
    }
  }

  try {
    await sendCrmTextMessage({
      userId: message.userId,
      to: message.to,
      message: sharedMessage ?? "",
      contactName: message.contactName,
      assignedTo: message.assignedTo,
      tagLabels: message.tagLabels,
    })
    await patchDispatchRecipient(message, {
      status: "enviado",
      checkedAt,
      sentAt: new Date().toISOString(),
      error: null,
    })
    return { status: "enviado" as const }
  } catch (error) {
    await patchDispatchRecipient(message, {
      status: "falha_envio",
      checkedAt,
      error: error instanceof Error ? error.message : "Falha ao enviar mensagem.",
    })
    throw error
  }
}

async function patchDispatchRecipient(
  message: WhatsappBroadcastMessage,
  patch: {
    status: WhatsappBroadcastRecipientStatus["status"]
    error?: string | null
    checkedAt?: string
    sentAt?: string
  },
) {
  const dispatchRecord = await getCrmRecordById("disparos", message.dispatchRecordId)
  if (!dispatchRecord) {
    throw new Error("Registro do disparo nao encontrado para atualizar o relatorio.")
  }

  const data = dispatchRecord.data as Record<string, unknown>
  const currentStatuses = Array.isArray(data.recipientStatuses) ? data.recipientStatuses : []
  let nextStatuses = currentStatuses.map((entry) => {
    if (!entry || typeof entry !== "object") return entry
    const item = entry as Record<string, unknown>
    if (String(item.phone ?? "") !== message.to) return entry

    return {
      ...item,
      contactName: message.contactName ?? item.contactName ?? null,
      labels: message.tagLabels ?? normalizeLabels(item.labels),
      status: patch.status,
      error: patch.error ?? null,
      checkedAt: patch.checkedAt ?? item.checkedAt ?? null,
      sentAt: patch.sentAt ?? item.sentAt ?? null,
      scheduledFor: item.scheduledFor ?? null,
    }
  })

  let summary = summarizeStatuses(nextStatuses)
  let nextStatus = resolveDispatchStatus(summary)

  if (shouldAutoPauseDispatch(summary, String(data.status ?? ""))) {
    nextStatuses = nextStatuses.map((entry) => {
      if (!entry || typeof entry !== "object") return entry
      const item = entry as Record<string, unknown>
      if (String(item.status ?? "") !== "agendado") return entry

      return {
        ...item,
        status: "auto_pausado",
        error: "Agendamento pausado automaticamente por excesso de falhas.",
        checkedAt: item.checkedAt ?? new Date().toISOString(),
      }
    })
    summary = summarizeStatuses(nextStatuses)
    nextStatus = "auto_pausado"
  }

  await updateCrmRecord(
    "disparos",
    dispatchRecord.id,
    {
      ...data,
      recipientStatuses: nextStatuses,
      summary,
      status: nextStatus,
    },
    dispatchRecord.owner_user_id ?? undefined,
  )
}

function summarizeStatuses(entries: unknown[]) {
  const summary = {
    total: entries.length,
    agendado: 0,
    interrompido: 0,
    autoPausado: 0,
    ignoradoDuplicado: 0,
    enviado: 0,
    semWhatsapp: 0,
    falhaValidacao: 0,
    falhaEnvio: 0,
  }

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue
    const status = String((entry as { status?: unknown }).status ?? "")
    if (status === "agendado") summary.agendado += 1
    if (status === "interrompido") summary.interrompido += 1
    if (status === "auto_pausado") summary.autoPausado += 1
    if (status === "ignorado_duplicado") summary.ignoradoDuplicado += 1
    if (status === "enviado") summary.enviado += 1
    if (status === "sem_whatsapp") summary.semWhatsapp += 1
    if (status === "falha_validacao") summary.falhaValidacao += 1
    if (status === "falha_envio") summary.falhaEnvio += 1
  }

  return summary
}

function normalizeLabels(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item ?? "").trim()).filter(Boolean)
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized || undefined
}

function normalizeMediaKind(value: unknown) {
  if (value === "imagem" || value === "video" || value === "documento") return value
  return undefined
}

function shouldAutoPauseDispatch(summary: ReturnType<typeof summarizeStatuses>, currentStatus: string) {
  if (currentStatus === "interrompido" || currentStatus === "auto_pausado") return false
  return summary.falhaValidacao + summary.falhaEnvio >= WHATSAPP_BROADCAST_AUTO_PAUSE_FAILURES
}

function resolveDispatchStatus(summary: ReturnType<typeof summarizeStatuses>) {
  if (summary.agendado > 0) return "agendado"
  if (summary.interrompido > 0 && summary.enviado === 0) return "interrompido"
  if (summary.interrompido > 0) return "interrompido-parcial"
  if (summary.autoPausado > 0 && summary.enviado === 0) return "auto_pausado"
  if (summary.autoPausado > 0) return "auto_pausado-parcial"
  if (summary.enviado === summary.total) return "concluido"
  if (summary.enviado > 0) return "concluido-parcial"
  return "concluido-sem-envios"
}

export function buildBroadcastSchedule(existingDispatchRecords: CrmRecord[], totalMessages: number, now = new Date()) {
  const bucketUsage = new Map<string, number>()

  for (const record of existingDispatchRecords) {
    const data = record.data as Record<string, unknown>
    const statuses = Array.isArray(data.recipientStatuses) ? data.recipientStatuses : []
    for (const entry of statuses) {
      if (!entry || typeof entry !== "object") continue
      const item = entry as Record<string, unknown>
      const status = String(item.status ?? "")
      if (status === "interrompido" || status === "auto_pausado" || status === "ignorado_duplicado") continue

      const referenceTime = normalizeDate(String(item.scheduledFor ?? item.sentAt ?? ""))
      if (!referenceTime) continue

      const bucket = hourBucketKey(referenceTime)
      bucketUsage.set(bucket, (bucketUsage.get(bucket) ?? 0) + 1)
    }
  }

  const scheduled: Array<{ scheduledAt: Date; delaySeconds: number }> = []
  let previousAt = new Date(now)

  for (let index = 0; index < totalMessages; index += 1) {
    let candidate = new Date(previousAt.getTime() + randomBroadcastDelaySeconds() * 1000)
    while ((bucketUsage.get(hourBucketKey(candidate)) ?? 0) >= WHATSAPP_BROADCAST_MAX_PER_HOUR) {
      candidate = moveToNextHourWindow(candidate)
    }

    const bucket = hourBucketKey(candidate)
    bucketUsage.set(bucket, (bucketUsage.get(bucket) ?? 0) + 1)
    scheduled.push({
      scheduledAt: candidate,
      delaySeconds: Math.max(0, Math.ceil((candidate.getTime() - now.getTime()) / 1000)),
    })
    previousAt = candidate
  }

  return scheduled
}

export function randomBroadcastDelaySeconds() {
  return (
    WHATSAPP_BROADCAST_MIN_DELAY_SECONDS +
    Math.floor(Math.random() * (WHATSAPP_BROADCAST_MAX_DELAY_SECONDS - WHATSAPP_BROADCAST_MIN_DELAY_SECONDS + 1))
  )
}

function normalizeDate(value: string) {
  if (!value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function hourBucketKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}`
}

function moveToNextHourWindow(reference: Date) {
  const next = new Date(reference)
  next.setMinutes(0, 0, 0)
  next.setHours(next.getHours() + 1)
  return next
}
