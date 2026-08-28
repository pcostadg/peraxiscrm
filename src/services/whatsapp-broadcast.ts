export const WHATSAPP_BROADCAST_TOPIC = "crm-whatsapp-broadcast"
export const WHATSAPP_BROADCAST_MIN_DELAY_SECONDS = 5
export const WHATSAPP_BROADCAST_MAX_DELAY_SECONDS = 10

export type WhatsappBroadcastMessage = {
  batchId: string
  userId: string
  to: string
  message?: string
  assignedTo?: string
  contactName?: string
  tagLabel?: string
  media?: string
  previewUrl?: string
  kind?: "imagem" | "video" | "documento"
  mimeType?: string
  fileName?: string
}

export function randomBroadcastDelaySeconds() {
  return (
    WHATSAPP_BROADCAST_MIN_DELAY_SECONDS +
    Math.floor(Math.random() * (WHATSAPP_BROADCAST_MAX_DELAY_SECONDS - WHATSAPP_BROADCAST_MIN_DELAY_SECONDS + 1))
  )
}
