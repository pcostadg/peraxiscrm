import { accepted, requireApiUser } from "@/app/api/_shared"
import { send } from "@/lib/vercel-queue"
import { createCrmRecord } from "@/services/crm-repository"
import { sendCrmMediaMessage, sendCrmTextMessage } from "@/services/crm-whatsapp"
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
  recipients?: Array<{ phone?: string; contactName?: string; label?: string; labels?: string[] }>
  message?: string
  media?: string
  previewUrl?: string
  kind?: "imagem" | "video" | "documento"
  mimeType?: string
  fileName?: string
  assignedTo?: string
  contactName?: string
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response

  const body = await request.json().catch(() => null) as BroadcastBody | null
  const message = String(body?.message ?? "").trim()
  const media = String(body?.media ?? "").trim() || undefined
  const assignedTo = String(body?.assignedTo ?? "").trim() || "Equipe"
  const importedRecipients = Array.isArray(body?.recipients)
    ? body.recipients.map((item) => ({
        phone: String(item?.phone ?? ""),
        contactName: String(item?.contactName ?? "").trim() || undefined,
        labels: Array.isArray(item?.labels) ? normalizeLabelList(item.labels) : splitLabelList(String(item?.label ?? "")),
      }))
    : []
  const parsedPhones = importedRecipients.length
    ? importedRecipients.map((item) => {
        const parsed = parsePhoneList(item.phone)
        const first = parsed[0]
        return {
          phone: first?.phone ?? "",
          valid: first?.valid ?? false,
          contactName: item.contactName,
          labels: item.labels,
        }
      })
    : parsePhoneList(String(body?.phones ?? "")).map((item) => ({ ...item, contactName: undefined, labels: [] as string[] }))
  const validPhones = parsedPhones.filter((item) => item.valid)
  const invalidPhones = parsedPhones.filter((item) => !item.valid).map((item) => item.phone)
  const kind = body?.kind
  const duplicatePhones = Array.from(
    validPhones.reduce((duplicates, item, _, items) => {
      if (items.filter((entry) => entry.phone === item.phone).length > 1) {
        duplicates.add(item.phone)
      }
      return duplicates
    }, new Set<string>()),
  )

  if (!message && !media) {
    return Response.json({ error: "Mensagem ou imagem obrigatoria." }, { status: 400 })
  }

  if (media && !kind) {
    return Response.json({ error: "Tipo da midia obrigatorio." }, { status: 400 })
  }

  if (!validPhones.length) {
    return Response.json({ error: "Informe ao menos um numero valido." }, { status: 400 })
  }

  if (duplicatePhones.length) {
    return Response.json(
      { error: `Remova os numeros duplicados antes de agendar: ${duplicatePhones.join(", ")}` },
      { status: 400 },
    )
  }

  const batchId = `broadcast-${Date.now()}`
  const queueMessages = validPhones.map<WhatsappBroadcastMessage>((item) => {
    return {
      batchId,
      userId: user.id,
      to: item.phone,
      message: message || undefined,
      assignedTo,
      contactName: item.contactName || String(body?.contactName ?? "").trim() || undefined,
      tagLabels: item.labels,
      media,
      previewUrl: String(body?.previewUrl ?? "").trim() || undefined,
      kind,
      mimeType: String(body?.mimeType ?? "").trim() || undefined,
      fileName: String(body?.fileName ?? "").trim() || undefined,
    }
  })

  const queueUnavailable = process.env.VERCEL !== "1"

  if (queueUnavailable) {
    void Promise.allSettled(
      queueMessages.map((item) =>
        item.media && item.kind
          ? sendCrmMediaMessage({
              userId: item.userId,
              to: item.to,
              media: item.media,
              kind: item.kind,
              message: item.message,
              previewUrl: item.previewUrl,
              mimeType: item.mimeType,
              fileName: item.fileName,
              contactName: item.contactName,
              assignedTo: item.assignedTo,
              tagLabels: item.tagLabels,
            })
          : sendCrmTextMessage({
              userId: item.userId,
              to: item.to,
              message: item.message ?? "",
              contactName: item.contactName,
              assignedTo: item.assignedTo,
              tagLabels: item.tagLabels,
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
      kind: kind ?? null,
      fileName: body?.fileName ?? null,
      assignedTo,
      phones: validPhones.map((item) => item.phone),
      recipients: validPhones.map((item) => ({
        phone: item.phone,
        contactName: item.contactName ?? null,
        labels: item.labels,
      })),
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

function splitLabelList(value: string) {
  return normalizeLabelList(value.split(","))
}

function normalizeLabelList(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)))
}
