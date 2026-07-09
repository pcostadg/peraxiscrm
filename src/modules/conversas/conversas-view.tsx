"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { File, ImageIcon, MessageCircle, Mic, Paperclip, PhoneCall, Plus, Send, Tag, Video, X } from "lucide-react"
import { chatMessages, conversations } from "@/modules/shared/data"
import { ModuleHeader, Pill, buttonClass, inputClass, textareaClass } from "@/modules/shared/components"
import { useRealtimeSync } from "@/services/use-realtime-sync"
import type { CrmRecord } from "@/services/crm-repository"
import type { ChatMessage, Conversation } from "@/types/crm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

const filters = ["todas", "nao lidas", "atribuidas", "chatbot", "manual"] as const
const attachmentTypes = [
  { label: "Imagem", icon: ImageIcon },
  { label: "Audio", icon: Mic },
  { label: "Video", icon: Video },
  { label: "Documento", icon: File },
]

type ConversationFormState = {
  contactName: string
  phone: string
  assignedTo: string
}

const emptyConversationForm: ConversationFormState = {
  contactName: "",
  phone: "",
  assignedTo: "",
}

function conversationFromRecord(record: CrmRecord): Conversation {
  const data = record.data
  const name = String(data.contactName ?? data.nome ?? record.title)
  return {
    id: record.id,
    contactName: name,
    phone: String(data.phone ?? data.telefone ?? ""),
    avatar: name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PX",
    source: (data.source as Conversation["source"]) ?? "manual",
    unread: Number(data.unread ?? 0),
    assignedTo: String(data.assignedTo ?? "Equipe"),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : ["z-api"],
    lastMessage: String(data.lastMessage ?? data.message ?? "Conversa iniciada."),
    updatedAt: String(data.updatedAt ?? "agora"),
    presenceStatus:
      data.presenceStatus === "available" ||
      data.presenceStatus === "unavailable" ||
      data.presenceStatus === "composing" ||
      data.presenceStatus === "paused" ||
      data.presenceStatus === "recording"
        ? data.presenceStatus
        : undefined,
  }
}

function messagesFromRecord(record: CrmRecord): ChatMessage[] {
  const data = record.data as Record<string, unknown>
  const items = Array.isArray(data.messages) ? data.messages : []
  return items.map((item, index) => {
    const message = item as Record<string, unknown>
    return {
      id: String(message.id ?? `${record.id}-${index}`),
      conversationId: record.id,
      direction: (message.direction as ChatMessage["direction"]) ?? "entrada",
      kind: (message.kind as ChatMessage["kind"]) ?? "texto",
      content: String(message.content ?? ""),
      status: (message.status as ChatMessage["status"]) ?? "entregue",
      time: String(message.time ?? "agora"),
    }
  })
}

export function ConversasView({ dbRecords = [] }: { dbRecords?: CrmRecord[] }) {
  const realtime = useRealtimeSync(["conversas", "agentes"])
  const initialConversations = dbRecords.length ? dbRecords.map(conversationFromRecord) : conversations
  const initialMessages = dbRecords.length ? dbRecords.flatMap(messagesFromRecord) : chatMessages
  const [conversationItems, setConversationItems] = useState<Conversation[]>(initialConversations)
  const [messageItems, setMessageItems] = useState<ChatMessage[]>(initialMessages)
  const [activeId, setActiveId] = useState(initialConversations[0]?.id ?? "")
  const [filter, setFilter] = useState<(typeof filters)[number]>("todas")
  const [draft, setDraft] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newConversation, setNewConversation] = useState<ConversationFormState>(emptyConversationForm)
  const [sending, setSending] = useState(false)
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [savingTags, setSavingTags] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function refreshConversations() {
      try {
        const response = await fetch("/api/conversas", { cache: "no-store" })
        const result = await response.json()
        if (!response.ok || !result?.data || cancelled) return

        const records = Array.isArray(result.data) ? (result.data as CrmRecord[]) : []
        const nextConversations = records.map(conversationFromRecord)
        const nextMessages = records.flatMap(messagesFromRecord)

        setConversationItems(nextConversations)
        setMessageItems(nextMessages)
        setActiveId((current) => {
          if (current && nextConversations.some((item) => item.id === current)) return current
          return nextConversations[0]?.id ?? ""
        })
      } catch {
        // Silent retry on next tick.
      }
    }

    void refreshConversations()
    const interval = window.setInterval(() => {
      void refreshConversations()
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [realtime.tick])

  const filtered = useMemo(
    () =>
      conversationItems.filter((item) => {
        if (filter === "todas") return true
        if (filter === "nao lidas") return item.unread > 0
        if (filter === "atribuidas") return Boolean(item.assignedTo)
        return item.source === filter
      }),
    [conversationItems, filter],
  )

  const active = conversationItems.find((item) => item.id === activeId) ?? conversationItems[0]
  const messages = messageItems.filter((message) => message.conversationId === active?.id)
  const activePresenceLabel = getPresenceLabel(active?.presenceStatus)
  const availableTags = useMemo(
    () => Array.from(new Set(conversationItems.flatMap((item) => item.tags.map((tag) => tag.trim()).filter(Boolean)))).sort(),
    [conversationItems],
  )

  async function handleStartConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = newConversation.contactName.trim() || "Novo contato"
    const id = `conversation-${Date.now()}`
    const conversation: Conversation = {
      id,
      contactName: name,
      phone: newConversation.phone.trim(),
      avatar: name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "PX",
      source: "manual",
      unread: 0,
      assignedTo: newConversation.assignedTo.trim() || "Equipe",
      tags: ["z-api", "manual"],
      lastMessage: "Conversa iniciada manualmente.",
      updatedAt: "agora",
    }

    try {
      const response = await fetch("/api/conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: conversation.contactName,
          contactName: conversation.contactName,
          phone: conversation.phone,
          source: conversation.source,
          assignedTo: conversation.assignedTo,
          tags: conversation.tags,
          lastMessage: conversation.lastMessage,
          updatedAt: conversation.updatedAt,
          messages: [],
          status: "aberta",
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel iniciar a conversa.")
      const persisted = conversationFromRecord(result.data ?? result)
      setConversationItems((current) => [persisted, ...current])
      setActiveId(persisted.id)
      setDialogOpen(false)
      setNewConversation(emptyConversationForm)
      toast.success("Conversa iniciada.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao iniciar conversa.")
    }
  }

  async function submitCurrentMessage() {
    if (!draft.trim() || !active || sending) return
    const messageText = draft.trim()
    setSending(true)
    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: active.phone,
          message: messageText,
          conversationId: active.id,
          contactName: active.contactName,
          simulateTyping: true,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel enviar a mensagem.")

      const nextMessage: ChatMessage = {
        id: `message-${Date.now()}`,
        conversationId: active.id,
        direction: "saida",
        kind: "texto",
        content: messageText,
        status: "enviado",
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      }

      setMessageItems((current) => [...current, nextMessage])
      setConversationItems((current) =>
        current.map((item) =>
          item.id === active.id
            ? { ...item, lastMessage: nextMessage.content, updatedAt: "agora", unread: 0 }
            : item,
        ),
      )
      setDraft("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar mensagem.")
    } finally {
      setSending(false)
    }
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitCurrentMessage()
  }

  async function saveConversationTags(tags: string[]) {
    if (!active) return
    setSavingTags(true)
    const cleanTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)))
    try {
      const response = await fetch("/api/conversas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: active.id,
          title: active.contactName,
          contactName: active.contactName,
          phone: active.phone,
          source: active.source,
          assignedTo: active.assignedTo,
          tags: cleanTags,
          lastMessage: active.lastMessage,
          updatedAt: active.updatedAt,
          unread: active.unread,
          presenceStatus: active.presenceStatus,
          messages: messageItems
            .filter((message) => message.conversationId === active.id)
            .map((message) => ({
              id: message.id,
              direction: message.direction,
              kind: message.kind,
              content: message.content,
              status: message.status,
              time: message.time,
            })),
          status: "aberta",
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel salvar as etiquetas.")

      setConversationItems((current) =>
        current.map((item) => (item.id === active.id ? { ...item, tags: cleanTags } : item)),
      )
      toast.success("Etiquetas salvas.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar etiquetas.")
    } finally {
      setSavingTags(false)
    }
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const tag = newTag.trim()
    if (!tag || !active) return
    await saveConversationTags([...(active.tags ?? []), tag])
    setNewTag("")
  }

  async function toggleTag(tag: string) {
    if (!active) return
    const normalized = tag.trim()
    const nextTags = active.tags.includes(normalized)
      ? active.tags.filter((item) => item !== normalized)
      : [...active.tags, normalized]
    await saveConversationTags(nextTags)
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={MessageCircle}
        title="Conversas"
        description="Central de atendimento com inicio manual de conversas, mensagens e audio integrados ao backend."
        action={
          <div className="flex items-center gap-2">
            <Pill tone={realtime.status === "tempo real" ? "emerald" : "amber"}>{realtime.status}</Pill>
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setDialogOpen(true)}>
              <PhoneCall size={18} />
              Novo numero
            </button>
          </div>
        }
      />

      <div className="grid min-h-[720px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] xl:grid-cols-[360px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50/70 xl:border-r xl:border-b-0">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold capitalize ${filter === item ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[640px] overflow-y-auto">
            {filtered.length ? (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition ${active?.id === item.id ? "bg-blue-50" : "hover:bg-white"}`}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {item.avatar}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate text-sm text-slate-900">{item.contactName}</strong>
                      <small className="text-xs text-slate-400">{item.updatedAt}</small>
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{item.lastMessage}</span>
                    {item.presenceStatus && item.presenceStatus !== "paused" && item.presenceStatus !== "unavailable" && (
                      <span className="mt-1 block text-[11px] font-semibold text-emerald-600">{getPresenceLabel(item.presenceStatus)}</span>
                    )}
                    <span className="mt-2 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <Pill key={tag} tone={tag === "manual" ? "blue" : "emerald"}>
                          {tag}
                        </Pill>
                      ))}
                    </span>
                  </span>

                  {item.unread > 0 && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {item.unread}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="p-6 text-sm text-slate-500">Nenhuma conversa encontrada nesse filtro.</div>
            )}
          </div>
        </aside>

        <section className="flex min-h-[720px] flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 p-4 backdrop-blur">
            <div>
              <h3 className="font-bold text-slate-900">{active?.contactName || "Nenhuma conversa selecionada"}</h3>
              <p className="text-xs text-slate-500">
                {active ? `${active.phone || "Sem telefone"} · ${active.assignedTo} · origem ${active.source}` : "Inicie uma conversa manual para começar."}
              </p>
              {activePresenceLabel && <p className="mt-1 text-xs font-semibold text-emerald-600">{activePresenceLabel}</p>}
              {active?.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {active.tags.map((tag) => (
                    <Pill key={tag} tone={tag === "manual" ? "blue" : "emerald"}>
                      {tag}
                    </Pill>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700" onClick={() => setTagDialogOpen(true)}>
                <Tag size={16} />
                Etiquetas
              </button>
              <Pill tone="blue">Z-API via backend</Pill>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messages.length ? (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.direction === "saida" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm shadow-sm sm:max-w-[62%] ${message.direction === "saida" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-900"}`}>
                    <p>
                      {message.kind !== "texto" && (
                        <strong className={`mr-2 uppercase ${message.direction === "saida" ? "text-blue-100" : "text-blue-600"}`}>
                          {message.kind}
                        </strong>
                      )}
                      {message.content}
                    </p>
                    <p className={`mt-2 text-right text-[11px] ${message.direction === "saida" ? "text-blue-100" : "text-slate-500"}`}>
                      {message.time} · {message.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white/80 text-center text-sm text-slate-400">
                Nenhuma mensagem ainda. Inicie um numero manualmente ou aguarde o backend da Z-API alimentar a conversa.
              </div>
            )}
          </div>

          <footer className="border-t border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {attachmentTypes.map((item) => {
                const Icon = item.icon
                return (
                  <label key={item.label} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    <Icon size={15} />
                    {item.label}
                    <input
                      className="sr-only"
                      type="file"
                      accept={
                        item.label === "Imagem"
                          ? "image/*"
                          : item.label === "Audio"
                            ? "audio/*"
                            : item.label === "Video"
                              ? "video/*"
                              : undefined
                      }
                    />
                  </label>
                )
              })}
            </div>

            <form className="flex items-end gap-3" onSubmit={handleSendMessage}>
              <button type="button" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600" aria-label="Anexos">
                <Paperclip size={20} />
              </button>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className={textareaClass}
                rows={1}
                disabled={sending}
                placeholder="Digite uma mensagem. Enter envia, Shift+Enter quebra linha."
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    submitCurrentMessage()
                  }
                }}
              />
              <button className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white disabled:cursor-not-allowed disabled:opacity-60" aria-label="Enviar mensagem" type="submit" disabled={sending}>
                <Send size={19} />
              </button>
            </form>
            {sending && <p className="mt-3 text-xs font-medium text-blue-600">Mostrando digitacao e aguardando 3 segundos antes de enviar a mensagem...</p>}
          </footer>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-white p-0">
          <form onSubmit={handleStartConversation}>
            <DialogHeader className="border-b border-slate-200 px-6 py-5">
              <DialogTitle>Chamar novo numero</DialogTitle>
              <DialogDescription>
                Crie manualmente uma conversa para a operacao iniciar o atendimento antes mesmo da primeira mensagem recebida.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 px-6 py-5">
              <div className="inline-flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <Plus size={16} className="mt-0.5" />
                <span>As credenciais reais da Z-API devem continuar fora do frontend. Esta tela esta pronta para conversar com o backend da instancia.</span>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome do contato</label>
                <input className={`${inputClass} mt-2`} value={newConversation.contactName} onChange={(event) => setNewConversation((current) => ({ ...current, contactName: event.target.value }))} placeholder="Nome ou empresa" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Numero</label>
                <input className={`${inputClass} mt-2`} value={newConversation.phone} onChange={(event) => setNewConversation((current) => ({ ...current, phone: event.target.value }))} placeholder="+5511999999999" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responsavel</label>
                <input className={`${inputClass} mt-2`} value={newConversation.assignedTo} onChange={(event) => setNewConversation((current) => ({ ...current, assignedTo: event.target.value }))} placeholder="Equipe ou agente" />
              </div>
            </div>

            <DialogFooter className="border-slate-200 bg-slate-50">
              <button type="button" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setDialogOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">
                <PhoneCall size={16} />
                Iniciar conversa
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="max-w-lg bg-white p-0">
          <DialogHeader className="border-b border-slate-200 px-6 py-5">
            <DialogTitle>Etiquetas do contato</DialogTitle>
            <DialogDescription>
              Selecione etiquetas existentes ou crie novas para organizar esse contato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Etiquetas atuais</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {active?.tags?.length ? (
                  active.tags.map((tag) => (
                    <button key={tag} type="button" onClick={() => void toggleTag(tag)} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                      {tag}
                      <X size={12} />
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Nenhuma etiqueta aplicada.</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Etiquetas disponiveis</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableTags.length ? (
                  availableTags.map((tag) => {
                    const selected = active?.tags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => void toggleTag(tag)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
                      >
                        {tag}
                      </button>
                    )
                  })
                ) : (
                  <span className="text-sm text-slate-500">Ainda nao existem etiquetas cadastradas.</span>
                )}
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleCreateTag}>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nova etiqueta</label>
              <div className="flex gap-3">
                <input className={inputClass} value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="Ex.: VIP, Suporte, Prioridade" />
                <button type="submit" className={buttonClass} disabled={savingTags || !newTag.trim()}>
                  <Plus size={16} />
                  Criar
                </button>
              </div>
            </form>
          </div>

          <DialogFooter className="border-slate-200 bg-slate-50">
            <button type="button" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setTagDialogOpen(false)}>
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getPresenceLabel(status?: Conversation["presenceStatus"]) {
  switch (status) {
    case "available":
      return "Cliente online"
    case "composing":
      return "Cliente digitando..."
    case "recording":
      return "Cliente gravando audio..."
    default:
      return ""
  }
}
