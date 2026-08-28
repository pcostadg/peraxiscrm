import { ok, requireApiUser } from "@/app/api/_shared"
import { getCrmRecordById, updateCrmRecord } from "@/services/crm-repository"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request)
  if (response) return response

  const params = await context.params
  const recordId = params.id
  const record = await getCrmRecordById("disparos", recordId)
  if (!record) {
    return Response.json({ error: "Disparo nao encontrado." }, { status: 404 })
  }

  if (user.role !== "admin" && record.owner_user_id !== user.id) {
    return Response.json({ error: "Sem permissao para alterar esse disparo." }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as { action?: string } | null
  if (body?.action !== "stop") {
    return Response.json({ error: "Acao invalida." }, { status: 400 })
  }

  const data = record.data as Record<string, unknown>
  const currentStatuses = Array.isArray(data.recipientStatuses) ? data.recipientStatuses : []
  const interruptedAt = new Date().toISOString()
  const nextStatuses = currentStatuses.map((entry) => {
    if (!entry || typeof entry !== "object") return entry
    const item = entry as Record<string, unknown>
    if (String(item.status ?? "") !== "agendado") return entry

    return {
      ...item,
      status: "interrompido",
      error: "Agendamento interrompido manualmente.",
      checkedAt: item.checkedAt ?? interruptedAt,
    }
  })

  const summary = summarizeStatuses(nextStatuses)
  const updated = await updateCrmRecord(
    "disparos",
    record.id,
    {
      ...data,
      recipientStatuses: nextStatuses,
      interruptedAt,
      summary,
      status: "interrompido",
    },
    record.owner_user_id ?? undefined,
  )

  return ok(updated)
}

function summarizeStatuses(entries: unknown[]) {
  const summary = {
    total: entries.length,
    agendado: 0,
    interrompido: 0,
    ignoradoDuplicado: 0,
    enviado: 0,
    semWhatsapp: 0,
    falhaValidacao: 0,
    falhaEnvio: 0,
  }

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue
    const status = String((entry as { status?: unknown }).status ?? "")
    if (status === "agendado") summary.agendado += 1
    if (status === "interrompido") summary.interrompido += 1
    if (status === "ignorado_duplicado") summary.ignoradoDuplicado += 1
    if (status === "enviado") summary.enviado += 1
    if (status === "sem_whatsapp") summary.semWhatsapp += 1
    if (status === "falha_validacao") summary.falhaValidacao += 1
    if (status === "falha_envio") summary.falhaEnvio += 1
  }

  return summary
}
