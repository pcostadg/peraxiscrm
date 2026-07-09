export type LeadStatus = "novo" | "contato" | "negociacao" | "ganho" | "perdido"
export type ProjectStatus = "planejado" | "em_andamento" | "pausado" | "concluido"
export type FinanceType = "receita" | "despesa"

export type Lead = {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: LeadStatus
  value: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  user_id: string
  lead_id: string | null
  name: string
  description: string | null
  status: ProjectStatus
  due_date: string | null
  budget: number
  created_at: string
  updated_at: string
}

export type FinanceEntry = {
  id: string
  user_id: string
  project_id: string | null
  description: string
  type: FinanceType
  category: string | null
  amount: number
  due_date: string
  paid: boolean
  created_at: string
  updated_at: string
}
