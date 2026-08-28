export const WHATSAPP_BROADCAST_TOPIC = "crm-whatsapp-broadcast"
export const WHATSAPP_BROADCAST_MIN_DELAY_SECONDS = 5
export const WHATSAPP_BROADCAST_MAX_DELAY_SECONDS = 10

import "server-only"

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
  status: "agendado" | "ignorado_duplicado" | "sem_whatsapp" | "enviado" | "falha_validacao" | "falha_envio"
  error?: string | null
  checkedAt?: string | null
  sentAt?: string | null
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
  const nextStatuses = currentStatuses.map((entry) => {
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
    }
  })

  const summary = summarizeStatuses(nextStatuses)
  const nextStatus =
    summary.agendado > 0
      ? "agendado"
      : summary.enviado === summary.total
        ? "concluido"
        : summary.enviado > 0
          ? "concluido-parcial"
          : "concluido-sem-envios"

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

export function randomBroadcastDelaySeconds() {
  return (
    WHATSAPP_BROADCAST_MIN_DELAY_SECONDS +
    Math.floor(Math.random() * (WHATSAPP_BROADCAST_MAX_DELAY_SECONDS - WHATSAPP_BROADCAST_MIN_DELAY_SECONDS + 1))
  )
}
