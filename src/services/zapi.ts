import "server-only"

type SendZApiTextInput = {
  to: string
  message: string
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

  const message =
    String(
      payload.text ??
        payload.message ??
        (typeof payload.body === "string" ? payload.body : "") ??
        (payload.text as { message?: string } | undefined)?.message ??
        "",
    ) ||
    String((payload.text as { message?: string } | undefined)?.message ?? "") ||
    (kind === "audio" ? "Audio recebido." : "Mensagem recebida.")

  return {
    phone,
    contactName,
    kind,
    message,
    messageId: String(payload.messageId ?? payload.id ?? `${phone}-${Date.now()}`),
    direction: String(payload.fromMe ?? payload.isSentByMe ? "saida" : "entrada") as "entrada" | "saida",
    raw: payload,
  }
}
