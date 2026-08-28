export const WHATSAPP_BROADCAST_TOPIC = "crm-whatsapp-broadcast"
export const WHATSAPP_BROADCAST_MIN_DELAY_SECONDS = 15
export const WHATSAPP_BROADCAST_MAX_DELAY_SECONDS = 25

export type WhatsappBroadcastMessage = {
  batchId: string
  userId: string
  to: string
  message: string
  assignedTo?: string
  contactName?: string
}

export function randomBroadcastDelaySeconds() {
  return (
    WHATSAPP_BROADCAST_MIN_DELAY_SECONDS +
    Math.floor(Math.random() * (WHATSAPP_BROADCAST_MAX_DELAY_SECONDS - WHATSAPP_BROADCAST_MIN_DELAY_SECONDS + 1))
  )
}
