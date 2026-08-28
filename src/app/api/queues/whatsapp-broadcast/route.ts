import { handleCallback } from "@/lib/vercel-queue"
import { sendCrmMediaMessage, sendCrmTextMessage } from "@/services/crm-whatsapp"
import type { WhatsappBroadcastMessage } from "@/services/whatsapp-broadcast"

export const POST = handleCallback(async (message: WhatsappBroadcastMessage) => {
  if (message.media && message.kind) {
    await sendCrmMediaMessage({
      userId: message.userId,
      to: message.to,
      media: message.media,
      kind: message.kind,
      message: message.message,
      previewUrl: message.previewUrl,
      mimeType: message.mimeType,
      fileName: message.fileName,
      contactName: message.contactName,
      assignedTo: message.assignedTo,
    })
    return
  }

  await sendCrmTextMessage({
    userId: message.userId,
    to: message.to,
    message: message.message ?? "",
    contactName: message.contactName,
    assignedTo: message.assignedTo,
  })
})
