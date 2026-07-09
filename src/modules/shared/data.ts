import type {
  Agent,
  ChatMessage,
  Conversation,
  DashboardMetric,
  DispatchReport,
  FinanceEntry,
  Lead,
  PaymentNotification,
  ProjectCard,
  ProjectColumn,
  RecurringClient,
  TeamMember,
} from "@/types/crm"

export const dashboardMetrics: DashboardMetric[] = [
  { id: "faturamento", title: "Faturamento", value: "R$ 0,00", hint: "Receitas confirmadas", trend: "0 no periodo", tone: "emerald", series: [0, 0, 0, 0, 0, 0, 0] },
  { id: "leads", title: "Leads fechados", value: "0", hint: "Clientes convertidos", trend: "0 novos", tone: "blue", series: [0, 0, 0, 0, 0, 0, 0] },
  { id: "conversas", title: "Conversas", value: "0", hint: "Atendimentos totais", trend: "0 abertas", tone: "violet", series: [0, 0, 0, 0, 0, 0, 0] },
  { id: "ativos", title: "Projetos ativos", value: "0", hint: "Operacao em andamento", trend: "0 em andamento", tone: "slate", series: [0, 0, 0, 0, 0, 0, 0] },
  { id: "pendentes", title: "Projetos pendentes", value: "0", hint: "Aguardando inicio ou aprovacao", trend: "0 pendentes", tone: "rose", series: [0, 0, 0, 0, 0, 0, 0] },
  { id: "usuarios", title: "Usuarios ativos", value: "0", hint: "Equipe com acesso liberado", trend: "0 ativos", tone: "amber", series: [0, 0, 0, 0, 0, 0, 0] },
]

export const dashboardChartSeries = [
  { month: "Jan", faturamento: 0, leads: 0, conversas: 0, disparos: 0, ativos: 0, pendentes: 0 },
  { month: "Fev", faturamento: 0, leads: 0, conversas: 0, disparos: 0, ativos: 0, pendentes: 0 },
  { month: "Mar", faturamento: 0, leads: 0, conversas: 0, disparos: 0, ativos: 0, pendentes: 0 },
  { month: "Abr", faturamento: 0, leads: 0, conversas: 0, disparos: 0, ativos: 0, pendentes: 0 },
  { month: "Mai", faturamento: 0, leads: 0, conversas: 0, disparos: 0, ativos: 0, pendentes: 0 },
  { month: "Jun", faturamento: 0, leads: 0, conversas: 0, disparos: 0, ativos: 0, pendentes: 0 },
]

export const conversations: Conversation[] = []

export const chatMessages: ChatMessage[] = []

export const leads: Lead[] = []

export const projectColumns: ProjectColumn[] = [
  { id: "backlog", title: "Backlog" },
  { id: "em_andamento", title: "Em andamento" },
  { id: "revisao", title: "Revisao" },
  { id: "concluido", title: "Concluido" },
]

export const projects: ProjectCard[] = []

export const dispatchReports: DispatchReport[] = []

export const financeEntries: FinanceEntry[] = []

export const recurringClients: RecurringClient[] = []

export const paymentNotifications: PaymentNotification[] = []

export const agents: Agent[] = []

export const teamMembers: TeamMember[] = []

export const companySettings = {
  nome: "",
  dominio: "",
  dados: "",
}

export function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}
