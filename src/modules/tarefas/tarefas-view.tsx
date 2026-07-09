"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Edit3, GripVertical, ListTodo, Plus, Search, Trash2 } from "lucide-react"
import { buttonClass, Field, inputClass, ModuleHeader, PanelCard, Pill, textareaClass } from "@/modules/shared/components"
import type { CrmRecord } from "@/services/crm-repository"
import type { TaskCard, TaskPriority } from "@/types/crm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type TaskStage = {
  id: string
  title: string
}

type TaskBoardConfig = {
  id: string | null
  stages: TaskStage[]
}

type TaskRecord = TaskCard & {
  status: string
}

type TaskFormState = {
  nome: string
  descricao: string
  prazo: string
  responsavel: string
  status: string
  prioridade: TaskPriority
}

const defaultTaskStages: TaskStage[] = [
  { id: "novo", title: "Novo" },
  { id: "em_andamento", title: "Em andamento" },
  { id: "revisao", title: "Revisao" },
  { id: "concluido", title: "Concluido" },
]

const emptyTaskForm: TaskFormState = {
  nome: "",
  descricao: "",
  prazo: "",
  responsavel: "",
  status: "novo",
  prioridade: "media",
}

function titleFromStage(id: string) {
  return id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function taskPriorityTone(priority: TaskPriority) {
  switch (priority) {
    case "baixa":
      return "emerald"
    case "media":
      return "amber"
    case "alta":
      return "orange"
    case "urgente":
      return "rose"
    default:
      return "blue"
  }
}

function normalizeStageId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function isTaskBoardConfigRecord(record: CrmRecord) {
  return record.data?.recordType === "task_stage_config"
}

function isTaskRecord(record: CrmRecord) {
  return record.data?.recordType === "task"
}

function getTaskBoardConfig(records: CrmRecord[]): TaskBoardConfig {
  const configRecord = records.find(isTaskBoardConfigRecord)
  const storedStages = Array.isArray(configRecord?.data?.stages)
    ? configRecord.data.stages
        .map((stage) => {
          if (!stage || typeof stage !== "object") return null
          const item = stage as Record<string, unknown>
          const id = String(item.id ?? "").trim()
          const title = String(item.title ?? "").trim()
          return id && title ? { id, title } : null
        })
        .filter((stage): stage is TaskStage => Boolean(stage))
    : []

  return {
    id: configRecord?.id ?? null,
    stages: storedStages,
  }
}

function taskFromRecord(record: CrmRecord): TaskRecord {
  const data = record.data
  return {
    id: record.id,
    nome: String(data.nome ?? record.title),
    descricao: String(data.descricao ?? ""),
    prazo: String(data.prazo ?? ""),
    responsavel: String(data.responsavel ?? ""),
    status: String(record.status ?? data.status ?? "novo"),
    prioridade: (data.prioridade as TaskPriority) ?? "media",
  }
}

function buildStages(items: TaskRecord[], configuredStages: TaskStage[] = []) {
  const base = configuredStages.length ? [...configuredStages] : [...defaultTaskStages]
  for (const item of items) {
    if (!base.some((stage) => stage.id === item.status)) {
      base.push({ id: item.status, title: titleFromStage(item.status) })
    }
  }
  return base
}

function formFromTask(task: TaskRecord): TaskFormState {
  return {
    nome: task.nome,
    descricao: task.descricao,
    prazo: task.prazo,
    responsavel: task.responsavel,
    status: task.status,
    prioridade: task.prioridade,
  }
}

export function TarefasView({ dbRecords = [] }: { dbRecords?: CrmRecord[] }) {
  const taskRecords = dbRecords.filter(isTaskRecord)
  const boardConfig = getTaskBoardConfig(dbRecords)
  const initialTasks = taskRecords.map(taskFromRecord)
  const [taskItems, setTaskItems] = useState<TaskRecord[]>(initialTasks)
  const [stages, setStages] = useState<TaskStage[]>(buildStages(initialTasks, boardConfig.stages))
  const [boardConfigId, setBoardConfigId] = useState<string | null>(boardConfig.id)
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [savingStages, setSavingStages] = useState(false)
  const [form, setForm] = useState<TaskFormState>(emptyTaskForm)

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return taskItems

    return taskItems.filter((task) =>
      [task.nome, task.responsavel, task.descricao]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    )
  }, [taskItems, query])

  const groupedTasks = useMemo(
    () =>
      stages.map((stage) => ({
        ...stage,
        items: filteredTasks.filter((task) => task.status === stage.id),
      })),
    [filteredTasks, stages],
  )

  function openNewTask() {
    setEditingTaskId(null)
    setForm({ ...emptyTaskForm, status: stages[0]?.id ?? "novo" })
    setDialogOpen(true)
  }

  function openEditTask(task: TaskRecord) {
    setEditingTaskId(task.id)
    setForm(formFromTask(task))
    setDialogOpen(true)
  }

  async function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload = {
      id: editingTaskId ?? undefined,
      title: form.nome.trim() || "Tarefa",
      recordType: "task",
      nome: form.nome.trim() || "Tarefa sem nome",
      descricao: form.descricao.trim(),
      prazo: form.prazo,
      responsavel: form.responsavel.trim(),
      prioridade: form.prioridade,
      status: form.status,
    }

    try {
      const response = await fetch("/api/tarefas", {
        method: editingTaskId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel salvar a tarefa.")

      const persisted = taskFromRecord(result.data ?? result)
      setTaskItems((current) => {
        if (editingTaskId) {
          return current.map((item) => (item.id === editingTaskId ? persisted : item))
        }
        return [persisted, ...current]
      })

      if (!stages.some((stage) => stage.id === persisted.status)) {
        setStages((current) => [...current, { id: persisted.status, title: titleFromStage(persisted.status) }])
      }

      setDialogOpen(false)
      toast.success(editingTaskId ? "Tarefa atualizada." : "Tarefa criada.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar tarefa.")
    }
  }

  async function handleDeleteTask(id: string) {
    const previous = taskItems
    setTaskItems((current) => current.filter((item) => item.id !== id))
    try {
      const response = await fetch("/api/tarefas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || "Nao foi possivel excluir a tarefa.")
      }
      toast.success("Tarefa excluida.")
    } catch (error) {
      setTaskItems(previous)
      toast.error(error instanceof Error ? error.message : "Falha ao excluir tarefa.")
    }
  }

  function handleStageRename(id: string, title: string) {
    setStages((current) => current.map((stage) => (stage.id === id ? { ...stage, title } : stage)))
  }

  async function persistStages(nextStages: TaskStage[]) {
    setSavingStages(true)
    try {
      const payload = {
        id: boardConfigId ?? undefined,
        title: "Configuracao do kanban de tarefas",
        recordType: "task_stage_config",
        stages: nextStages,
        status: "config",
      }

      const response = await fetch("/api/tarefas", {
        method: boardConfigId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel salvar as colunas.")

      const persisted = (result.data ?? result) as CrmRecord
      if (persisted?.id) setBoardConfigId(persisted.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar colunas.")
      throw error
    } finally {
      setSavingStages(false)
    }
  }

  async function handleAddStage() {
    const nextNumber = stages.length + 1
    const title = `Nova coluna ${nextNumber}`
    const nextStages = [...stages, { id: normalizeStageId(title), title }]
    setStages(nextStages)
    try {
      await persistStages(nextStages)
      toast.success("Coluna criada.")
    } catch {}
  }

  async function handleDeleteStage(stageId: string) {
    if (stages.length <= 1) {
      toast.error("Voce precisa manter ao menos uma coluna no kanban.")
      return
    }

    const stage = stages.find((item) => item.id === stageId)
    const targetStage = stages.find((item) => item.id !== stageId)
    if (!stage || !targetStage) return

    const stageTasks = taskItems.filter((item) => item.status === stageId)
    const previousTasks = taskItems
    const previousStages = stages
    const nextStages = stages.filter((item) => item.id !== stageId)
    const nextTasks = taskItems.map((item) => (item.status === stageId ? { ...item, status: targetStage.id } : item))

    if (
      !window.confirm(
        stageTasks.length
          ? `Excluir a coluna ${stage.title}? As ${stageTasks.length} tarefas dela vao para ${targetStage.title}.`
          : `Excluir a coluna ${stage.title}?`,
      )
    ) {
      return
    }

    setStages(nextStages)
    setTaskItems(nextTasks)

    try {
      await Promise.all(
        stageTasks.map(async (task) => {
          const response = await fetch("/api/tarefas", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...task, title: task.nome, recordType: "task", status: targetStage.id }),
          })
          if (!response.ok) {
            const result = await response.json().catch(() => ({}))
            throw new Error(result.error || `Nao foi possivel mover a tarefa ${task.nome}.`)
          }
        }),
      )

      await persistStages(nextStages)
      toast.success("Coluna excluida.")
    } catch (error) {
      setStages(previousStages)
      setTaskItems(previousTasks)
      toast.error(error instanceof Error ? error.message : "Falha ao excluir coluna.")
    }
  }

  function moveTaskToStage(taskId: string, stageId: string) {
    setTaskItems((current) => current.map((item) => (item.id === taskId ? { ...item, status: stageId } : item)))
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={ListTodo}
        title="Tarefas"
        description="Kanban operacional para acompanhar entregas, prioridades e responsaveis."
        action={
          <button type="button" className={buttonClass} onClick={openNewTask}>
            <Plus size={18} />
            Nova tarefa
          </button>
        }
      />

      <PanelCard className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Search size={18} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 flex-1 bg-transparent text-sm outline-none"
              placeholder="Buscar por tarefa, responsavel ou descricao"
            />
          </div>

          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleAddStage()}
            disabled={savingStages}
          >
            <Plus size={18} />
            Nova coluna
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {groupedTasks.map((stage) => (
            <PanelCard
              key={stage.id}
              className="flex min-h-[420px] flex-col border-dashed p-4"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingTaskId) moveTaskToStage(draggingTaskId, stage.id)
                setDraggingTaskId(null)
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-slate-300" />
                  <input
                    value={stage.title}
                    onChange={(event) => handleStageRename(stage.id, event.target.value)}
                    onBlur={() => void persistStages(stages)}
                    className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone="slate">{stage.items.length}</Pill>
                  <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void handleDeleteStage(stage.id)}
                    disabled={savingStages}
                    aria-label={`Excluir coluna ${stage.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex-1 space-y-3 rounded-2xl bg-slate-50/80 p-2">
                {stage.items.length ? (
                  stage.items.map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggingTaskId(task.id)}
                      onDragEnd={() => setDraggingTaskId(null)}
                      className="cursor-grab rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{task.nome}</p>
                          <p className="mt-1 text-xs text-slate-500">{task.responsavel || "Responsavel nao informado"}</p>
                        </div>
                        <GripVertical size={16} className="text-slate-300" />
                      </div>

                      <p className="mt-3 text-sm text-slate-500">{task.descricao || "Sem descricao cadastrada."}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill tone={taskPriorityTone(task.prioridade)}>{task.prioridade}</Pill>
                        <Pill tone="slate">{task.prazo || "Sem prazo"}</Pill>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button type="button" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700" onClick={() => openEditTask(task)}>
                          <Edit3 size={14} />
                          Editar
                        </button>
                        <button type="button" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="flex h-full min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-center text-sm text-slate-400">
                    Arraste tarefas para esta coluna
                  </div>
                )}
              </div>
            </PanelCard>
          ))}
        </div>
      </PanelCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-0 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.48)]">
          <form onSubmit={handleSaveTask}>
            <DialogHeader className="border-b border-slate-200 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_72%)] px-8 py-6">
              <DialogTitle>{editingTaskId ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
              <DialogDescription>Popup amplo para cadastrar tarefa, prioridade, prazo e responsavel sem apertar a operacao.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 px-8 py-7 lg:grid-cols-2">
              <Field label="Nome da tarefa">
                <input required className={inputClass} value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Nome da tarefa" />
              </Field>
              <Field label="Responsavel">
                <input className={inputClass} value={form.responsavel} onChange={(event) => setForm((current) => ({ ...current, responsavel: event.target.value }))} placeholder="Responsavel" />
              </Field>
              <Field label="Prazo de entrega">
                <input className={inputClass} type="date" value={form.prazo} onChange={(event) => setForm((current) => ({ ...current, prazo: event.target.value }))} />
              </Field>
              <Field label="Etapa">
                <select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prioridade">
                <select className={inputClass} value={form.prioridade} onChange={(event) => setForm((current) => ({ ...current, prioridade: event.target.value as TaskPriority }))}>
                  <option value="baixa">baixa</option>
                  <option value="media">media</option>
                  <option value="alta">alta</option>
                  <option value="urgente">urgente</option>
                </select>
              </Field>
              <div className="flex flex-wrap items-end gap-2">
                <Pill tone="emerald">Baixa</Pill>
                <Pill tone="amber">Media</Pill>
                <Pill tone="orange">Alta</Pill>
                <Pill tone="rose">Urgente</Pill>
              </div>
              <div className="lg:col-span-2">
                <Field label="Descricao da tarefa">
                  <textarea className={textareaClass} value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} placeholder="Contexto e detalhes da tarefa" />
                </Field>
              </div>
            </div>

            <DialogFooter className="border-slate-200 bg-slate-50 px-8 py-5">
              <button type="button" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setDialogOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className={buttonClass}>
                {editingTaskId ? "Salvar alteracoes" : "Salvar tarefa"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
