"use client"

import { useMemo, useState, type FormEvent } from "react"
import { BriefcaseBusiness, Edit3, GripVertical, LayoutGrid, List, MessageSquare, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { projectColumns, projects } from "@/modules/shared/data"
import { buttonClass, Field, inputClass, ModuleHeader, PanelCard, Pill, textareaClass } from "@/modules/shared/components"
import type { CrmRecord } from "@/services/crm-repository"
import type { ProjectCard, ProjectPriority } from "@/types/crm"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type ProjectStage = {
  id: string
  title: string
}

type ProjectBoardConfig = {
  id: string | null
  stages: ProjectStage[]
}

type ProjectRecord = ProjectCard & {
  status: string
}

type ProjectFormState = {
  cliente: string
  nome: string
  descricao: string
  prazo: string
  responsavel: string
  status: string
  prioridade: ProjectPriority
}

const emptyProjectForm: ProjectFormState = {
  cliente: "",
  nome: "",
  descricao: "",
  prazo: "",
  responsavel: "",
  status: "backlog",
  prioridade: "media",
}

function titleFromStage(id: string) {
  return id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function projectPriorityTone(priority: ProjectPriority) {
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

function projectFromRecord(record: CrmRecord): ProjectRecord {
  const data = record.data
  return {
    id: record.id,
    cliente: String(data.cliente ?? data.client ?? ""),
    nome: String(data.nome ?? record.title),
    descricao: String(data.descricao ?? ""),
    prazo: String(data.prazo ?? ""),
    responsavel: String(data.responsavel ?? ""),
    status: String(record.status ?? data.status ?? "backlog"),
    prioridade: (data.prioridade as ProjectPriority) ?? "media",
    comentarios: Number(data.comentarios ?? 0),
    historico: Array.isArray(data.historico) ? data.historico.map(String) : [],
  }
}

function isProjectBoardConfigRecord(record: CrmRecord) {
  return record.data?.recordType === "project_stage_config"
}

function isTaskRecord(record: CrmRecord) {
  return record.data?.recordType === "task" || record.data?.recordType === "task_stage_config"
}

function getProjectBoardConfig(records: CrmRecord[]): ProjectBoardConfig {
  const configRecord = records.find(isProjectBoardConfigRecord)
  const storedStages = Array.isArray(configRecord?.data?.stages)
    ? configRecord.data.stages
        .map((stage) => {
          if (!stage || typeof stage !== "object") return null
          const item = stage as Record<string, unknown>
          const id = String(item.id ?? "").trim()
          const title = String(item.title ?? "").trim()
          return id && title ? { id, title } : null
        })
        .filter((stage): stage is ProjectStage => Boolean(stage))
    : []

  return {
    id: configRecord?.id ?? null,
    stages: storedStages,
  }
}

function buildStages(items: ProjectRecord[], configuredStages: ProjectStage[] = []) {
  const base = configuredStages.length ? [...configuredStages] : [...projectColumns]
  for (const item of items) {
    if (!base.some((stage) => stage.id === item.status)) {
      base.push({ id: item.status, title: titleFromStage(item.status) })
    }
  }
  return base
}

function formFromProject(project: ProjectRecord): ProjectFormState {
  return {
    cliente: project.cliente,
    nome: project.nome,
    descricao: project.descricao,
    prazo: project.prazo,
    responsavel: project.responsavel,
    status: project.status,
    prioridade: project.prioridade,
  }
}

export function ProjetosView({ dbRecords = [] }: { dbRecords?: CrmRecord[] }) {
  const sanitizedRecords = dbRecords.filter((record) => !isTaskRecord(record))
  const projectRecords = sanitizedRecords.filter((record) => !isProjectBoardConfigRecord(record))
  const boardConfig = getProjectBoardConfig(sanitizedRecords)
  const initialProjects = projectRecords.length ? projectRecords.map(projectFromRecord) : projects
  const [viewMode, setViewMode] = useState<"lista" | "kanban">("kanban")
  const [projectItems, setProjectItems] = useState<ProjectRecord[]>(initialProjects)
  const [stages, setStages] = useState<ProjectStage[]>(buildStages(initialProjects, boardConfig.stages))
  const [boardConfigId, setBoardConfigId] = useState<string | null>(boardConfig.id)
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null)
  const [form, setForm] = useState<ProjectFormState>(emptyProjectForm)
  const [savingStages, setSavingStages] = useState(false)

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return projectItems

    return projectItems.filter((project) =>
      [project.nome, project.cliente, project.responsavel, project.descricao]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    )
  }, [projectItems, query])

  const groupedProjects = useMemo(
    () =>
      stages.map((stage) => ({
        ...stage,
        items: filteredProjects.filter((project) => project.status === stage.id),
      })),
    [filteredProjects, stages],
  )

  function openNewProject() {
    setEditingProjectId(null)
    setForm({ ...emptyProjectForm, status: stages[0]?.id ?? "backlog" })
    setDialogOpen(true)
  }

  function openEditProject(project: ProjectRecord) {
    setEditingProjectId(project.id)
    setForm(formFromProject(project))
    setDialogOpen(true)
  }

  async function handleSaveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: ProjectRecord = {
      id: editingProjectId ?? `project-${Date.now()}`,
      cliente: form.cliente.trim(),
      nome: form.nome.trim() || "Projeto sem nome",
      descricao: form.descricao.trim(),
      prazo: form.prazo,
      responsavel: form.responsavel.trim(),
      status: form.status,
      prioridade: form.prioridade,
      comentarios: editingProjectId
        ? projectItems.find((item) => item.id === editingProjectId)?.comentarios ?? 0
        : 0,
      historico: editingProjectId
        ? projectItems.find((item) => item.id === editingProjectId)?.historico ?? []
        : ["Projeto criado pelo painel."],
    }

    try {
      const response = await fetch("/api/projetos", {
        method: editingProjectId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Nao foi possivel salvar o projeto.")

      const persisted = projectFromRecord(result.data ?? result)
      setProjectItems((current) => {
        if (editingProjectId) {
          return current.map((item) => (item.id === editingProjectId ? persisted : item))
        }
        return [persisted, ...current]
      })

      if (!stages.some((stage) => stage.id === persisted.status)) {
        setStages((current) => [...current, { id: persisted.status, title: titleFromStage(persisted.status) }])
      }

      setDialogOpen(false)
      toast.success(editingProjectId ? "Projeto atualizado." : "Projeto criado.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar projeto.")
    }
  }

  async function handleDeleteProject(id: string) {
    const previous = projectItems
    setProjectItems((current) => current.filter((item) => item.id !== id))
    try {
      const response = await fetch("/api/projetos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || "Nao foi possivel excluir o projeto.")
      }
      toast.success("Projeto excluido.")
    } catch (error) {
      setProjectItems(previous)
      toast.error(error instanceof Error ? error.message : "Falha ao excluir projeto.")
    }
  }

  function handleStageRename(id: string, title: string) {
    setStages((current) => current.map((stage) => (stage.id === id ? { ...stage, title } : stage)))
  }

  async function persistStages(nextStages: ProjectStage[]) {
    setSavingStages(true)
    try {
      const payload = {
        id: boardConfigId ?? undefined,
        title: "Configuracao do kanban de projetos",
        recordType: "project_stage_config",
        stages: nextStages,
        status: "config",
      }

      const response = await fetch("/api/projetos", {
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
    const id = normalizeStageId(title)
    const nextStages = [...stages, { id, title }]
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
    if (!stage) return

    const targetStage = stages.find((item) => item.id !== stageId)
    if (!targetStage) return

    const stageProjects = projectItems.filter((item) => item.status === stageId)
    const previousProjects = projectItems
    const previousStages = stages
    const nextStages = stages.filter((item) => item.id !== stageId)
    const nextProjects = projectItems.map((item) => (item.status === stageId ? { ...item, status: targetStage.id } : item))

    if (
      !window.confirm(
        stageProjects.length
          ? `Excluir a coluna ${stage.title}? Os ${stageProjects.length} projetos dela vao para ${targetStage.title}.`
          : `Excluir a coluna ${stage.title}?`,
      )
    ) {
      return
    }

    setStages(nextStages)
    setProjectItems(nextProjects)

    try {
      await Promise.all(
        stageProjects.map(async (project) => {
          const response = await fetch("/api/projetos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...project, status: targetStage.id }),
          })
          if (!response.ok) {
            const result = await response.json().catch(() => ({}))
            throw new Error(result.error || `Nao foi possivel mover o projeto ${project.nome}.`)
          }
        }),
      )

      await persistStages(nextStages)
      toast.success("Coluna excluida.")
    } catch (error) {
      setStages(previousStages)
      setProjectItems(previousProjects)
      toast.error(error instanceof Error ? error.message : "Falha ao excluir coluna.")
    }
  }

  function moveProjectToStage(projectId: string, stageId: string) {
    setProjectItems((current) => current.map((item) => (item.id === projectId ? { ...item, status: stageId } : item)))
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={BriefcaseBusiness}
        title="Projetos"
        description="Gestao por kanban ou lista, com criacao em pop-up, colunas editaveis e movimentacao por arraste."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${viewMode === "kanban" ? "bg-blue-600 text-white" : "text-slate-600"}`}
              >
                <LayoutGrid size={16} />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode("lista")}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${viewMode === "lista" ? "bg-blue-600 text-white" : "text-slate-600"}`}
              >
                <List size={16} />
                Lista
              </button>
            </div>
            <button type="button" className={buttonClass} onClick={openNewProject}>
              <Plus size={18} />
              Novo projeto
            </button>
          </div>
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
              placeholder="Buscar por projeto, cliente, responsavel ou descricao"
            />
          </div>

          {viewMode === "kanban" && (
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void handleAddStage()} disabled={savingStages}>
              <Plus size={18} />
              Nova coluna
            </button>
          )}
        </div>

        {viewMode === "lista" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.8fr_120px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Projeto</span>
              <span>Cliente</span>
              <span>Etapa</span>
              <span>Responsavel</span>
              <span>Prazo</span>
              <span className="text-right">Acoes</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredProjects.length ? (
                filteredProjects.map((project) => {
                  const stageTitle = stages.find((stage) => stage.id === project.status)?.title ?? titleFromStage(project.status)

                  return (
                    <div key={project.id} className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.8fr_120px] gap-3 px-4 py-4 text-sm text-slate-700">
                      <div>
                        <p className="font-semibold text-slate-900">{project.nome}</p>
                        <p className="mt-1 text-xs text-slate-500">{project.descricao || "Sem descricao"}</p>
                      </div>
                      <span>{project.cliente || "-"}</span>
                      <Pill tone="blue">{stageTitle}</Pill>
                      <span>{project.responsavel || "-"}</span>
                      <span>{project.prazo || "-"}</span>
                      <div className="flex justify-end gap-2">
                        <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600" onClick={() => openEditProject(project)}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600" onClick={() => handleDeleteProject(project.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-slate-500">Nenhum projeto encontrado com esse filtro.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-4">
            {groupedProjects.map((stage) => (
              <PanelCard
                key={stage.id}
                className="flex min-h-[420px] flex-col border-dashed p-4"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingProjectId) moveProjectToStage(draggingProjectId, stage.id)
                  setDraggingProjectId(null)
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
                    stage.items.map((project) => (
                      <article
                        key={project.id}
                        draggable
                        onDragStart={() => setDraggingProjectId(project.id)}
                        onDragEnd={() => setDraggingProjectId(null)}
                        className="cursor-grab rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:cursor-grabbing"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{project.nome}</p>
                            <p className="mt-1 text-xs text-slate-500">{project.cliente || "Cliente nao informado"}</p>
                          </div>
                          <GripVertical size={16} className="text-slate-300" />
                        </div>

                        <p className="mt-3 text-sm text-slate-500">{project.descricao || "Sem descricao cadastrada."}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Pill tone={projectPriorityTone(project.prioridade)}>{project.prioridade}</Pill>
                          <Pill tone="slate">{project.prazo || "Sem prazo"}</Pill>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <MessageSquare size={14} />
                          {project.comentarios} comentarios
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button type="button" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700" onClick={() => openEditProject(project)}>
                            <Edit3 size={14} />
                            Editar
                          </button>
                          <button type="button" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600" onClick={() => handleDeleteProject(project.id)}>
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="flex h-full min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-center text-sm text-slate-400">
                      Arraste projetos para esta coluna
                    </div>
                  )}
                </div>
              </PanelCard>
            ))}
          </div>
        )}
      </PanelCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-0 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.48)]">
          <form onSubmit={handleSaveProject}>
            <DialogHeader className="border-b border-slate-200 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_72%)] px-8 py-6">
              <DialogTitle>{editingProjectId ? "Editar projeto" : "Novo projeto"}</DialogTitle>
              <DialogDescription>
                Um popup mais largo para cadastrar prioridades, prazo e escopo sem apertar a operacao do kanban.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 px-8 py-7 lg:grid-cols-2">
              <Field label="Cliente vinculado"><input className={inputClass} value={form.cliente} onChange={(event) => setForm((current) => ({ ...current, cliente: event.target.value }))} placeholder="Nome do cliente" /></Field>
              <Field label="Nome do projeto"><input required className={inputClass} value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Nome do projeto" /></Field>
              <Field label="Prazo"><input className={inputClass} type="date" value={form.prazo} onChange={(event) => setForm((current) => ({ ...current, prazo: event.target.value }))} /></Field>
              <Field label="Responsavel"><input className={inputClass} value={form.responsavel} onChange={(event) => setForm((current) => ({ ...current, responsavel: event.target.value }))} placeholder="Responsavel" /></Field>
              <Field label="Etapa"><select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}</select></Field>
              <Field label="Prioridade"><select className={inputClass} value={form.prioridade} onChange={(event) => setForm((current) => ({ ...current, prioridade: event.target.value as ProjectPriority }))}><option value="baixa">baixa</option><option value="media">media</option><option value="alta">alta</option><option value="urgente">urgente</option></select></Field>
              <div className="lg:col-span-2 flex flex-wrap gap-2">
                <Pill tone="emerald">Baixa</Pill>
                <Pill tone="amber">Media</Pill>
                <Pill tone="orange">Alta</Pill>
                <Pill tone="rose">Urgente</Pill>
              </div>
              <div className="lg:col-span-2">
                <Field label="Descricao">
                  <textarea className={textareaClass} value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} placeholder="Escopo e detalhes do projeto" />
                </Field>
              </div>
            </div>

            <DialogFooter className="border-slate-200 bg-slate-50 px-8 py-5">
              <button type="button" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={() => setDialogOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className={buttonClass}>
                {editingProjectId ? "Salvar alteracoes" : "Salvar projeto"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
