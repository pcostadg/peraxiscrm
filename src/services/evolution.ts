import "server-only"

import { Buffer } from "node:buffer"
import { normalizePhone as normalizeBrazilianPhone } from "@/services/validators"

type SendEvolutionTextInput = {
  to: string
  message: string
}

type SendEvolutionAudioInput = {
  to: string
  audio: string
  delayTyping?: number
}

type SendEvolutionMediaInput = {
  to: string
  media: string
  kind: "imagem" | "video" | "documento"
  caption?: string
  fileName?: string
  mimeType?: string
}

type ResolveEvolutionPhoneResult = {
  inputPhone: string
  phone: string
  exists: boolean
}

export type ParsedEvolutionWebhook =
  | {
      event: "presence"
      phone: string
      contactName: string
      presenceStatus: "available" | "unavailable" | "composing" | "paused" | "recording"
      raw: Record<string, unknown>
    }
  | {
      event: "message"
      phone: string
      contactName: string
      kind: "texto" | "imagem" | "audio" | "video" | "documento"
      message: string
      mediaUrl?: string
      mimeType?: string
      fileName?: string
      messageId: string
      direction: "entrada" | "saida"
      raw: Record<string, unknown>
    }

function normalizePhone(value: string) {
  return normalizeBrazilianPhone(value)
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

async function parseApiResponse(response: Response) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return { raw: text }
  }
}

export function getEvolutionConfig() {
  const baseUrl = trimTrailingSlash(process.env.EVOLUTION_API_URL?.trim() || "")
  const apiKey = process.env.EVOLUTION_API_KEY?.trim() || ""
  const instanceName = process.env.EVOLUTION_INSTANCE?.trim() || ""
  const instanceToken = process.env.EVOLUTION_INSTANCE_TOKEN?.trim() || ""
  const defaultNumber = process.env.EVOLUTION_DEFAULT_NUMBER?.trim() || ""
  const encodedInstanceName = encodeURIComponent(instanceName)

  if (!baseUrl || !apiKey || !instanceName) {
    throw new Error("Credenciais da Evolution API nao configuradas no backend.")
  }

  return {
    baseUrl,
    apiKey,
    instanceName,
    instanceToken,
    defaultNumber,
    sendTextUrl: `${baseUrl}/message/sendText/${encodedInstanceName}`,
    sendAudioUrl: `${baseUrl}/message/sendWhatsAppAudio/${encodedInstanceName}`,
    sendMediaUrl: `${baseUrl}/message/sendMedia/${encodedInstanceName}`,
  }
}

export async function resolveEvolutionPhone(input: string): Promise<ResolveEvolutionPhoneResult> {
  const normalizedInput = normalizePhone(input)
  return {
    inputPhone: input,
    phone: normalizedInput,
    exists: Boolean(normalizedInput),
  }
}

export async function sendEvolutionTextMessage(input: SendEvolutionTextInput) {
  const config = getEvolutionConfig()
  const response = await fetch(config.sendTextUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
    },
    body: JSON.stringify({
      number: normalizePhone(input.to),
      text: input.message,
    }),
    cache: "no-store",
  })

  const result = await parseApiResponse(response)
  if (!response.ok) {
    throw new Error(typeof result === "object" && result ? JSON.stringify(result) : "A Evolution API recusou o envio.")
  }

  return result
}

export async function sendEvolutionAudioMessage(input: SendEvolutionAudioInput) {
  const config = getEvolutionConfig()
  const normalizedAudio = normalizeOwnedMedia(input.audio)
  const primaryPayload = {
    number: normalizePhone(input.to),
    options: {
      delay: input.delayTyping ?? 1200,
      presence: "recording",
      encoding: true,
    },
    audio: normalizedAudio,
  }

  const primary = await postEvolutionJson(config.sendAudioUrl, config.apiKey, primaryPayload)
  if (primary.ok) return primary.result

  const fallbackPayload = {
    number: normalizePhone(input.to),
    options: {
      delay: input.delayTyping ?? 1200,
      presence: "recording",
      encoding: true,
    },
    audioMessage: {
      audio: normalizedAudio,
    },
  }
  const fallback = await postEvolutionJson(config.sendAudioUrl, config.apiKey, fallbackPayload)
  if (fallback.ok) return fallback.result

  throw new Error(formatEvolutionError(fallback.result ?? primary.result, "A Evolution API recusou o envio do audio."))
}

export async function sendEvolutionMediaMessage(input: SendEvolutionMediaInput) {
  const config = getEvolutionConfig()
  const normalizedMedia = normalizeOwnedMedia(input.media)
  const mediaFileName = resolveUploadFileName(input)

  const primaryPayload = {
    number: normalizePhone(input.to),
    mediatype: input.kind === "imagem" ? "image" : input.kind === "video" ? "video" : "document",
    media: normalizedMedia,
    fileName: mediaFileName,
    caption: input.caption?.trim() || undefined,
    mimetype: input.mimeType?.trim() || undefined,
  }

  const primary = await postEvolutionJson(config.sendMediaUrl, config.apiKey, primaryPayload)
  if (primary.ok) return primary.result

  const form = new FormData()
  form.set("number", normalizePhone(input.to))
  if (input.caption?.trim()) form.set("caption", input.caption.trim())
  if (mediaFileName) form.set("fileName", mediaFileName)

  const mediaValue = createOwnedMediaFormValue(normalizedMedia, input.mimeType, mediaFileName)
  if (mediaValue.kind === "url") {
    form.set("media", mediaValue.value)
  } else {
    form.set("media", mediaValue.value, mediaValue.fileName)
  }

  const fallback = await postEvolutionForm(config.sendMediaUrl, config.apiKey, form)
  if (fallback.ok) return fallback.result

  throw new Error(formatEvolutionError(fallback.result ?? primary.result, `A Evolution API recusou o envio de ${input.kind}.`))
}

async function postEvolutionJson(url: string, apiKey: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const result = await parseApiResponse(response)
  return { ok: response.ok, result }
}

async function postEvolutionForm(url: string, apiKey: string, form: FormData) {
  const response = await fetch(url, {
    method: "POST",
    headers: { apikey: apiKey },
    body: form,
    cache: "no-store",
  })

  const result = await parseApiResponse(response)
  return { ok: response.ok, result }
}

function normalizeOwnedMedia(value: string) {
  const normalized = value.trim()
  const dataUrlMatch = normalized.match(/^data:([^;]+);base64,(.+)$/)
  if (dataUrlMatch) return dataUrlMatch[2]
  return normalized
}

function createOwnedMediaFormValue(media: string, mimeType?: string, fileName?: string) {
  if (/^https?:\/\//i.test(media)) {
    return { kind: "url" as const, value: media }
  }

  const contentType = mimeType?.trim() || "application/octet-stream"
  const bytes = Buffer.from(media, "base64")
  const blob = new Blob([bytes], { type: contentType })
  return { kind: "blob" as const, value: blob, fileName }
}

function resolveUploadFileName(input: SendEvolutionMediaInput) {
  if (input.fileName?.trim()) return input.fileName.trim()
  if (input.kind === "imagem") return "imagem"
  if (input.kind === "video") return "video"
  return "documento"
}

function formatEvolutionError(result: unknown, fallbackMessage: string) {
  if (typeof result === "object" && result) return JSON.stringify(result)
  return fallbackMessage
}

export function isValidEvolutionWebhook(request: Request, body: string) {
  const expected = process.env.EVOLUTION_WEBHOOK_SECRET?.trim() || process.env.EVOLUTION_API_KEY?.trim()
  if (!expected) return true

  const authHeader = request.headers.get("authorization")
  const authToken = authHeader?.replace(/^Bearer\s+/i, "").trim()
  let payloadApiKey = ""
  try {
    const parsed = JSON.parse(body) as { apikey?: unknown }
    payloadApiKey = typeof parsed.apikey === "string" ? parsed.apikey.trim() : ""
  } catch {
    payloadApiKey = ""
  }

  const candidates = [
    request.headers.get("apikey"),
    request.headers.get("apiKey"),
    request.headers.get("x-api-key"),
    authToken,
    new URL(request.url).searchParams.get("token"),
    payloadApiKey,
  ].filter((value): value is string => Boolean(value?.trim()))

  if (!candidates.length) return body.length > 0
  return candidates.includes(expected)
}

export function parseEvolutionWebhookPayload(payload: Record<string, unknown>) {
  const event = String(payload.event ?? "").toLowerCase()
  const data = payload.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>) : payload
  const key = data.key && typeof data.key === "object" ? (data.key as Record<string, unknown>) : {}

  const phone = String(payload.sender ?? data.sender ?? key.remoteJid ?? data.remoteJid ?? payload.phone ?? "")
    .replace(/@.+$/, "")
    .replace(/\D/g, "")

  const contactName = normalizeTextCandidate(
    data.pushName ?? data.notifyName ?? data.senderName ?? payload.senderName ?? payload.pushName,
  )

  if (event.includes("presence")) {
    return {
      event: "presence",
      phone,
      contactName,
      presenceStatus: extractPresenceStatus(payload, data),
      raw: payload,
    } satisfies ParsedEvolutionWebhook
  }

  const kind = resolveMessageKind(data)
  const media = extractMediaData(data, kind)

  return {
    event: "message",
    phone,
    contactName,
    kind,
    message: extractMessageText(data),
    mediaUrl: media.mediaUrl,
    mimeType: media.mimeType,
    fileName: media.fileName,
    messageId: String(key.id ?? data.id ?? `${phone}-${Date.now()}`),
    direction: (key.fromMe === true || data.fromMe === true ? "saida" : "entrada") as "entrada" | "saida",
    raw: payload,
  } satisfies ParsedEvolutionWebhook
}

export function isEvolutionStatusWebhook(payload: Record<string, unknown>) {
  return String(payload.event ?? "").toLowerCase() === "messages.update"
}

export function extractEvolutionStatusUpdates(payload: Record<string, unknown>) {
  const data = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : []

  return data.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    const item = entry as Record<string, unknown>
    const key = item.key && typeof item.key === "object" ? (item.key as Record<string, unknown>) : {}
    const update = item.update && typeof item.update === "object" ? (item.update as Record<string, unknown>) : item
    const messageId = firstString([key.id, item.id, update.id])
    if (!messageId) return []

    return [{
      messageId,
      status: mapEvolutionMessageStatus(update.status ?? update.statusMessage ?? update.messageStatus),
    }]
  })
}

function extractPresenceStatus(
  payload: Record<string, unknown>,
  data: Record<string, unknown>,
): "available" | "unavailable" | "composing" | "paused" | "recording" {
  const status = String(data.lastKnownPresence ?? data.status ?? payload.status ?? "").toUpperCase()

  switch (status) {
    case "AVAILABLE":
      return "available"
    case "UNAVAILABLE":
      return "unavailable"
    case "COMPOSING":
      return "composing"
    case "RECORDING":
      return "recording"
    default:
      return "paused"
  }
}

function resolveMessageKind(data: Record<string, unknown>): "texto" | "imagem" | "audio" | "video" | "documento" {
  const messageType = String(data.messageType ?? "").toLowerCase()
  const message = data.message && typeof data.message === "object" ? (data.message as Record<string, unknown>) : {}

  if (message.imageMessage || messageType.includes("image")) return "imagem"
  if (message.audioMessage || messageType.includes("audio") || messageType.includes("ptt")) return "audio"
  if (message.videoMessage || messageType.includes("video")) return "video"
  if (message.documentMessage || messageType.includes("document")) return "documento"
  return "texto"
}

function extractMessageText(data: Record<string, unknown>) {
  const message = data.message && typeof data.message === "object" ? (data.message as Record<string, unknown>) : {}
  const candidates: unknown[] = [
    data.text,
    data.body,
    data.caption,
    message.conversation,
    (message.extendedTextMessage as { text?: unknown } | undefined)?.text,
    (message.imageMessage as { caption?: unknown } | undefined)?.caption,
    (message.videoMessage as { caption?: unknown } | undefined)?.caption,
    (message.documentMessage as { caption?: unknown } | undefined)?.caption,
    (message.buttonsResponseMessage as { selectedDisplayText?: unknown } | undefined)?.selectedDisplayText,
    (message.listResponseMessage as { title?: unknown; description?: unknown } | undefined)?.title,
    (message.listResponseMessage as { title?: unknown; description?: unknown } | undefined)?.description,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeTextCandidate(candidate)
    if (normalized) return normalized
  }

  return ""
}

function extractMediaData(data: Record<string, unknown>, kind: string) {
  const message = data.message && typeof data.message === "object" ? (data.message as Record<string, unknown>) : {}
  const nestedPayloads = [message.imageMessage, message.audioMessage, message.videoMessage, message.documentMessage, data]
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object")

  const mediaUrl = firstString(
    nestedPayloads.flatMap((item) => [item.url, item.mediaUrl, item.imageUrl, item.audioUrl, item.videoUrl, item.documentUrl, item.directPath, item.base64, item.data]),
  )
  const mimeType = firstString(nestedPayloads.flatMap((item) => [item.mimetype, item.mimeType]))
  const fileName = firstString(nestedPayloads.flatMap((item) => [item.fileName, item.filename, item.title, kind === "audio" ? "audio.ogg" : ""]))

  return { mediaUrl, mimeType, fileName }
}

function mapEvolutionMessageStatus(value: unknown): "enviado" | "entregue" | "lido" | "falha" {
  const normalized = String(value ?? "").trim().toUpperCase()
  if (["READ", "READ_BY_ME", "PLAYED", "4"].includes(normalized)) return "lido"
  if (["DELIVERY_ACK", "DELIVERED", "3", "2"].includes(normalized)) return "entregue"
  if (["SERVER_ACK", "SENT", "1"].includes(normalized)) return "enviado"
  return "falha"
}

function firstString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function normalizeTextCandidate(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (!value || typeof value !== "object") return ""

  const objectValue = value as Record<string, unknown>
  for (const candidate of [objectValue.message, objectValue.text, objectValue.body, objectValue.caption, objectValue.content]) {
    const normalized = normalizeTextCandidate(candidate)
    if (normalized) return normalized
  }

  return ""
}
