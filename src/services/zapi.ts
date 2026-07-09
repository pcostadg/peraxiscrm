import "server-only"

type SendZApiTextInput = {
  to: string
  message: string
}

type SendZApiPresenceInput = {
  to: string
  status: "composing" | "paused"
}

export type ParsedZApiWebhook =
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
  return value.replace(/\D/g, "")
}

export function getZApiConfig() {
  const instanceId = process.env.Z_API_INSTANCE_ID
  const instanceToken = process.env.Z_API_INSTANCE_TOKEN
  const clientToken = process.env.Z_API_CLIENT_TOKEN
  const baseUrl = process.env.Z_API_BASE_URL
  const sendTextUrl = process.env.Z_API_SEND_TEXT_URL
  const sendPresenceUrl = process.env.Z_API_SEND_PRESENCE_URL
  const defaultNumber = process.env.Z_API_DEFAULT_NUMBER

  if (!instanceId || !instanceToken || !clientToken) {
    throw new Error("Credenciais da Z-API nao configuradas no backend.")
  }

  const resolvedBaseUrl = baseUrl || `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}`
  return {
    instanceId,
    instanceToken,
    clientToken,
    defaultNumber: defaultNumber || "",
    baseUrl: resolvedBaseUrl,
    sendTextUrl: sendTextUrl || `${resolvedBaseUrl}/send-text`,
    sendPresenceUrl: sendPresenceUrl || `${resolvedBaseUrl}/send-chat-presence`,
  }
}

export async function sendZApiTextMessage(input: SendZApiTextInput) {
  const config = getZApiConfig()
  const response = await fetch(config.sendTextUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": config.clientToken,
    },
    body: JSON.stringify({
      phone: normalizePhone(input.to),
      message: input.message,
    }),
    cache: "no-store",
  })

  const text = await response.text()
  let result: unknown = null
  try {
    result = text ? JSON.parse(text) : null
  } catch {
    result = { raw: text }
  }

  if (!response.ok) {
    throw new Error(typeof result === "object" && result ? JSON.stringify(result) : "A Z-API recusou o envio.")
  }

  return result
}

export async function sendZApiPresence(input: SendZApiPresenceInput) {
  const config = getZApiConfig()
  const response = await fetch(config.sendPresenceUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": config.clientToken,
    },
    body: JSON.stringify({
      phone: normalizePhone(input.to),
      status: input.status,
    }),
    cache: "no-store",
  })

  const text = await response.text()
  let result: unknown = null
  try {
    result = text ? JSON.parse(text) : null
  } catch {
    result = { raw: text }
  }

  if (!response.ok) {
    throw new Error(typeof result === "object" && result ? JSON.stringify(result) : "A Z-API recusou o presence.")
  }

  return result
}

export function isValidZApiWebhook(request: Request, body: string) {
  const expected = process.env.Z_API_CLIENT_TOKEN
  if (!expected) return true

  const candidates = [
    request.headers.get("client-token"),
    request.headers.get("Client-Token"),
    request.headers.get("x-api-token"),
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
    new URL(request.url).searchParams.get("token"),
  ].filter(Boolean)

  if (!candidates.length) return body.length > 0
  return candidates.includes(expected)
}

export function parseZApiWebhookPayload(payload: Record<string, unknown>) {
  const phone =
    String(payload.phone ?? payload.from ?? payload.chatLid ?? payload.remoteJid ?? payload.senderPhone ?? "")
      .replace(/@.+$/, "")
      .replace(/\D/g, "")

  const contactName = normalizeTextCandidate(
    payload.senderName ?? payload.pushName ?? payload.notifyName ?? payload.name ?? payload.contactName,
  )

  const rawPresenceStatus = String(payload.status ?? "").toUpperCase()
  if (String(payload.type ?? "") === "PresenceChatCallback" && rawPresenceStatus) {
    return {
      event: "presence",
      phone,
      contactName,
      presenceStatus: mapPresenceStatus(rawPresenceStatus),
      raw: payload,
    } satisfies ParsedZApiWebhook
  }

  const kind = resolveMessageKind(payload)

  const media = extractMediaData(payload, kind)
  const message = extractMessageText(payload)

  return {
    event: "message",
    phone,
    contactName,
    kind,
    message,
    mediaUrl: media.mediaUrl,
    mimeType: media.mimeType,
    fileName: media.fileName,
    messageId: String(payload.messageId ?? payload.id ?? `${phone}-${Date.now()}`),
    direction: (payload.fromMe === true || payload.isSentByMe === true ? "saida" : "entrada") as "entrada" | "saida",
    raw: payload,
  } satisfies ParsedZApiWebhook
}

function resolveMessageKind(payload: Record<string, unknown>): "texto" | "imagem" | "audio" | "video" | "documento" {
  const payloadType = String(payload.type ?? "").toLowerCase()

  if (payload.audio && typeof payload.audio === "object") return "audio"
  if (payload.image && typeof payload.image === "object") return "imagem"
  if (payload.video && typeof payload.video === "object") return "video"
  if (payload.document && typeof payload.document === "object") return "documento"

  if (payloadType === "audio" || payloadType === "ptt") return "audio"
  if (payloadType === "image") return "imagem"
  if (payloadType === "video") return "video"
  if (payloadType === "document") return "documento"

  return "texto"
}

function mapPresenceStatus(value: string): "available" | "unavailable" | "composing" | "paused" | "recording" {
  switch (value) {
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

function extractMessageText(payload: Record<string, unknown>) {
  const candidates: unknown[] = [
    payload.text,
    payload.message,
    payload.body,
    payload.caption,
    payload.content,
    payload.msg,
    (payload.text as { message?: unknown } | undefined)?.message,
    (payload.message as { text?: unknown; caption?: unknown; body?: unknown } | undefined)?.text,
    (payload.message as { text?: unknown; caption?: unknown; body?: unknown } | undefined)?.caption,
    (payload.message as { text?: unknown; caption?: unknown; body?: unknown } | undefined)?.body,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeTextCandidate(candidate)
    if (normalized) return normalized
  }

  return ""
}

function extractMediaData(payload: Record<string, unknown>, kind: string) {
  const nestedPayloads = [payload.audio, payload.image, payload.video, payload.document, payload].filter(
    (value): value is Record<string, unknown> => Boolean(value) && typeof value === "object",
  )

  const mediaUrl = firstString(
    nestedPayloads.flatMap((item) => [
      item.audioUrl,
      item.imageUrl,
      item.videoUrl,
      item.documentUrl,
      item.url,
      item.fileUrl,
      item.mediaUrl,
    ]),
  )

  const mimeType = firstString(nestedPayloads.map((item) => item.mimeType))
  const fileName = firstString(
    nestedPayloads.flatMap((item) => [item.fileName, item.filename, item.name, kind === "audio" ? "audio.ogg" : ""]),
  )

  return { mediaUrl, mimeType, fileName }
}

function firstString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }

  return undefined
}

function normalizeTextCandidate(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed || ""
  }

  if (!value || typeof value !== "object") return ""

  const objectValue = value as Record<string, unknown>
  const nestedCandidates = [
    objectValue.message,
    objectValue.text,
    objectValue.body,
    objectValue.caption,
    objectValue.content,
  ]

  for (const candidate of nestedCandidates) {
    const normalized = normalizeTextCandidate(candidate)
    if (normalized) return normalized
  }

  return ""
}
