import type { LucideIcon } from "lucide-react"

export type UserRole = "admin" | "funcionario"
export type EntityStatus = "ativo" | "inativo"
export type LeadStatus = "novo" | "contato" | "qualificado" | "proposta" | "fechado" | "perdido"
export type ProjectStatus = "backlog" | "em_andamento" | "revisao" | "concluido"
export type ProjectPriority = "baixa" | "media" | "alta" | "urgente"
export type PaymentStatus = "pendente" | "pago" | "atrasado" | "cancelado"
export type ConversationSource = "chatbot" | "anuncio" | "disparo" | "manual"
export type MessageKind = "texto" | "imagem" | "audio" | "video" | "documento"
export type MessageDirection = "entrada" | "saida"
export type DispatchStatus = "enviado" | "entregue" | "lido" | "falha" | "pendente"
export type ConversationPresenceStatus = "available" | "unavailable" | "composing" | "paused" | "recording"
export type ConversationTagTone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate"
export type FinanceType = "entrada" | "saida"
export type RecurringStatus = "ativo" | "pausado" | "cancelado"
export type NotificationStatus = "em_dia" | "proximo" | "atrasado"

export type SessionUser = {
  id: string
  name: string
  username: string
  email: string
  role: UserRole
}

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  adminOnly?: boolean
}

export type DashboardMetric = {
  id: string
  title: string
  value: string
  hint: string
  trend: string
  tone: "blue" | "emerald" | "amber" | "rose" | "violet" | "slate"
  series: number[]
}

export type ConversationTag = {
  label: string
  tone: ConversationTagTone
}

export type Conversation = {
  id: string
  contactName: string
  phone: string
  avatar: string
  source: ConversationSource
  unread: number
  assignedTo: string
  tags: ConversationTag[]
  lastMessage: string
  updatedAt: string
  presenceStatus?: ConversationPresenceStatus
}

export type ChatMessage = {
  id: string
  conversationId: string
  direction: MessageDirection
  kind: MessageKind
  content: string
  status: DispatchStatus
  time: string
}

export type Lead = {
  id: string
  nome: string
  telefone: string
  email: string
  cpfCnpj: string
  endereco: string
  origem: ConversationSource | "indicacao" | "site"
  status: LeadStatus
  observacoes: string
  plano: string
  produto: string
  valor: number
  vencimento: string
  responsavel: string
  formaPagamento: string
  statusPagamento: PaymentStatus
}

export type ProjectColumn = {
  id: ProjectStatus | string
  title: string
}

export type ProjectCard = {
  id: string
  cliente: string
  nome: string
  descricao: string
  prazo: string
  responsavel: string
  status: ProjectStatus | string
  prioridade: ProjectPriority
  comentarios: number
  historico: string[]
}

export type DispatchReport = {
  id: string
  nome: string
  tipo: "livre" | "template"
  total: number
  enviado: number
  entregue: number
  lido: number
  falha: number
  motivoFalha?: string
}

export type FinanceEntry = {
  id: string
  tipo: FinanceType
  descricao: string
  categoria: string
  valor: number
  data: string
  formaPagamento: string
  lead?: string
  projeto?: string
}

export type AgentFlowStep = {
  id: string
  title: string
  detail: string
}

export type Agent = {
  id: string
  nome: string
  descricao: string
  status: EntityStatus
  phoneNumberId: string
  wabaId: string
  verifyTokenMasked: string
  fluxo: AgentFlowStep[]
}

export type TeamMember = {
  id: string
  nome: string
  email: string
  telefone: string
  cargo: string
  role: UserRole
  status: EntityStatus
  conversasAtendidas: number
  leadsFechados: number
  tempoMedio: string
}

export type RecurringClient = {
  id: string
  cliente: string
  telefone: string
  plano: string
  mensalidade: number
  valorAPagar: number
  vencimento: string
  status: RecurringStatus
}

export type PaymentNotification = {
  id: string
  cliente: string
  telefone: string
  valor: number
  vencimento: string
  status: NotificationStatus
  mensagem: string
}
