import { handleCallback } from "@/lib/vercel-queue"
import { sendCrmTextMessage } from "@/services/crm-whatsapp"
import type { WhatsappBroadcastMessage } from "@/services/whatsapp-broadcast"

export const POST = handleCallback(async (message: WhatsappBroadcastMessage) => {
  await sendCrmTextMessage({
    userId: message.userId,
    to: message.to,
    message: message.message,
    contactName: message.contactName,
    assignedTo: message.assignedTo,
  })
})
