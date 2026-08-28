import { ConversasView } from "@/modules/conversas/conversas-view"
import { requireAuth } from "@/lib/auth"
import { limitConversationMessagesRecord, summarizeConversationRecord } from "@/services/conversation-records"
import { listCrmRecords, type CrmRecord } from "@/services/crm-repository"

export default async function ConversasPage() {
  const user = await requireAuth()
  const records = await listCrmRecords(
    "conversas",
    user.role === "admin" ? undefined : user.id,
    user.role === "admin" ? undefined : { includeUnowned: true },
  )
  const summaryRecords = (records as CrmRecord[]).map((record) => summarizeConversationRecord(record, 0))
  const initialActiveRecord = records[0] ? limitConversationMessagesRecord(records[0] as CrmRecord) : null

  return <ConversasView dbRecords={summaryRecords} initialActiveRecord={initialActiveRecord} />
}
