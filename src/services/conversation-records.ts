import type { CrmRecord } from "@/services/crm-repository"

export const DEFAULT_CONVERSATION_MESSAGE_LIMIT = 40
export const DEFAULT_CONVERSATION_SUMMARY_LIMIT = 1

function normalizeMessages(value: unknown) {
  return Array.isArray(value) ? value : []
}

export function summarizeConversationRecord(record: CrmRecord, previewMessageCount = DEFAULT_CONVERSATION_SUMMARY_LIMIT): CrmRecord {
  const data = record.data as Record<string, unknown>
  const messages = normalizeMessages(data.messages)

  return {
    ...record,
    data: {
      ...data,
      messages: previewMessageCount > 0 ? messages.slice(-previewMessageCount) : [],
      messageCount: messages.length,
    },
  }
}

export function limitConversationMessagesRecord(record: CrmRecord, messageLimit = DEFAULT_CONVERSATION_MESSAGE_LIMIT): CrmRecord {
  const data = record.data as Record<string, unknown>
  const messages = normalizeMessages(data.messages)

  return {
    ...record,
    data: {
      ...data,
      messages: messageLimit > 0 ? messages.slice(-messageLimit) : [],
      messageCount: messages.length,
    },
  }
}
