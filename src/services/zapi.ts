import "server-only"

type SendZApiTextInput = {
  to: string
  message: string
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

  const contactName = String(
    payload.senderName ??
      payload.pushName ??
      payload.notifyName ??
      payload.name ??
      payload.contactName ??
      "Contato Z-API",
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

  const kind =
    payload.type === "audio" || payload.type === "ptt"
      ? "audio"
      : payload.type === "image"
        ? "imagem"
        : payload.type === "video"
          ? "video"
          : payload.type === "document"
            ? "documento"
            : "texto"

  const message = extractMessageText(payload, kind)

  return {
    event: "message",
    phone,
    contactName,
    kind,
    message,
    messageId: String(payload.messageId ?? payload.id ?? `${phone}-${Date.now()}`),
    direction: (payload.fromMe === true || payload.isSentByMe === true ? "saida" : "entrada") as "entrada" | "saida",
    raw: payload,
  } satisfies ParsedZApiWebhook
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

function extractMessageText(payload: Record<string, unknown>, kind: string) {
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

  return kind === "audio" ? "Audio recebido." : "Mensagem recebida."
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
