import { accepted, requireApiUser } from "@/app/api/_shared"
import { send } from "@/lib/vercel-queue"
import { createCrmRecord } from "@/services/crm-repository"
import { sendCrmTextMessage } from "@/services/crm-whatsapp"
import { parsePhoneList } from "@/services/validators"
import {
  randomBroadcastDelaySeconds,
  WHATSAPP_BROADCAST_MAX_DELAY_SECONDS,
  WHATSAPP_BROADCAST_MIN_DELAY_SECONDS,
  WHATSAPP_BROADCAST_TOPIC,
  type WhatsappBroadcastMessage,
} from "@/services/whatsapp-broadcast"

type BroadcastBody = {
  phones?: string
  message?: string
  assignedTo?: string
  contactName?: string
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response

  const body = await request.json().catch(() => null) as BroadcastBody | null
  const message = String(body?.message ?? "").trim()
  const assignedTo = String(body?.assignedTo ?? "").trim() || "Equipe"
  const parsedPhones = parsePhoneList(String(body?.phones ?? ""))
  const validPhones = parsedPhones.filter((item) => item.valid)
  const invalidPhones = parsedPhones.filter((item) => !item.valid).map((item) => item.phone)

  if (!message) {
    return Response.json({ error: "Mensagem obrigatoria." }, { status: 400 })
  }

  if (!validPhones.length) {
    return Response.json({ error: "Informe ao menos um numero valido." }, { status: 400 })
  }

  const batchId = `broadcast-${Date.now()}`
  const queueMessages = validPhones.map<WhatsappBroadcastMessage>((item) => {
    return {
      batchId,
      userId: user.id,
      to: item.phone,
      message,
      assignedTo,
      contactName: String(body?.contactName ?? "").trim() || undefined,
    }
  })

  const queueUnavailable = process.env.VERCEL !== "1"

  if (queueUnavailable) {
    void Promise.allSettled(
      queueMessages.map((item) =>
        sendCrmTextMessage({
          userId: item.userId,
          to: item.to,
          message: item.message,
          contactName: item.contactName,
          assignedTo: item.assignedTo,
        }),
      ),
    )
  } else {
    let accumulatedDelaySeconds = 0
    await Promise.all(
      queueMessages.map((item, index) => {
        if (index > 0) {
          accumulatedDelaySeconds += randomBroadcastDelaySeconds()
        }

        return send(WHATSAPP_BROADCAST_TOPIC, item, {
          delaySeconds: accumulatedDelaySeconds,
          idempotencyKey: `${batchId}-${index}-${item.to}`,
        })
      }),
    )
  }

  await createCrmRecord(
    "disparos",
    {
      title: `Disparo em lote ${new Date().toLocaleDateString("pt-BR")}`,
      batchId,
      message,
      assignedTo,
      phones: validPhones.map((item) => item.phone),
      invalidPhones,
      totalValidPhones: validPhones.length,
      totalInvalidPhones: invalidPhones.length,
      intervalSeconds: {
        min: WHATSAPP_BROADCAST_MIN_DELAY_SECONDS,
        max: WHATSAPP_BROADCAST_MAX_DELAY_SECONDS,
      },
      status: queueUnavailable ? "processando-local" : "agendado",
    },
    user.id,
  )

  return accepted(
    `${validPhones.length} mensagem${validPhones.length > 1 ? "ens" : ""} agendada${validPhones.length > 1 ? "s" : ""} com intervalo aleatorio de ${WHATSAPP_BROADCAST_MIN_DELAY_SECONDS} a ${WHATSAPP_BROADCAST_MAX_DELAY_SECONDS} segundos.`,
    {
      batchId,
      validPhones: validPhones.map((item) => item.phone),
      invalidPhones,
      totalValidPhones: validPhones.length,
      totalInvalidPhones: invalidPhones.length,
      background: !queueUnavailable,
    },
  )
}
