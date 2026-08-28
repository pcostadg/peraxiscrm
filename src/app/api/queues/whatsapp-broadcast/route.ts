import { handleCallback } from "@/lib/vercel-queue"
import { processWhatsappBroadcastMessage, type WhatsappBroadcastMessage } from "@/services/whatsapp-broadcast"

export const POST = handleCallback(async (message: WhatsappBroadcastMessage) => {
  await processWhatsappBroadcastMessage(message)
})
