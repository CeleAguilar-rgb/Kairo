'use server'

import {
  addSprintTaskSchema,
  closeSprintSchema,
  projectLinkSchema,
  projectSchema,
  startSprintSchema,
  type TaskStatus,
} from '@kairo/shared'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import type { Task } from '@/features/tasks'
import { api, ApiError } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import type { ProjectDetailRecord, ProjectLink, ProjectObjective, ProjectTask, SprintRecord } from './types'

// Las acciones de Proyectos. Una Server Action es un endpoint público: lo que llega NO se confía, se vuelve a
// validar con el mismo esquema del front (packages/shared), y ese esquema también es el contrato de la API, que
// lo revisa otra vez. El userId lo pone la API con el token (regla 2) y toda consulta filtra por él (regla 3).
export type ProjectActionResult =
  | { ok: true; id: string }
  // `errors` va por campo ("name", "goalOn", "links.0.url"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

const failure = (message: string): ProjectActionResult => ({ ok: false, errors: {}, message })

// Un error de la API que es de un campo del formulario va junto a ese campo.
const FIELD_BY_CODE: Record<string, string> = { GOAL_BEFORE_START: 'goalOn' }

function apiFailure(error: unknown, fallback: string): ProjectActionResult {
  if (!(error instanceof ApiError)) return failure(fallback)
  const field = FIELD_BY_CODE[error.code]
  return field ? { ok: false, errors: { [field]: error.message } } : failure(error.message)
}

const idSchema = z.uuid()
const NOT_FOUND = 'No encontramos ese proyecto.'

// Las pantallas de un proyecto, la galería, Inicio (su tarjeta de proyectos) y Tareas (que muestra el proyecto
// de cada tarea) leen del mismo proyecto.
function refresh(projectId?: string) {
  revalidatePath('/proyectos')
  if (projectId) revalidatePath(`/proyectos/${projectId}`, 'layout')
  revalidatePath('/')
  revalidatePath('/tareas')
}

// --- El formulario de proyecto ---------------------------------------------------------------------

export async function createProjectAction(raw: unknown): Promise<ProjectActionResult> {
  const parsed = projectSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const project = await api.post<ProjectDetailRecord>('/projects', parsed.data)
    refresh()
    return { ok: true, id: project.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar el proyecto. Intenta de nuevo.')
  }
}

export async function updateProjectAction(id: string, raw: unknown): Promise<ProjectActionResult> {
  if (!idSchema.safeParse(id).success) return failure(NOT_FOUND)
  const parsed = projectSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.patch(`/projects/${id}`, parsed.data)
    refresh(id)
    return { ok: true, id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar los cambios. Intenta de nuevo.')
  }
}

// --- El Resumen del proyecto -----------------------------------------------------------------------

// Marca o desmarca un objetivo.
export async function toggleObjectiveAction(projectId: string, objectiveId: string): Promise<ProjectActionResult> {
  if (!idSchema.safeParse(projectId).success || !idSchema.safeParse(objectiveId).success) return failure('No encontramos ese objetivo.')
  try {
    const objective = await api.post<ProjectObjective>(`/projects/${projectId}/objectives/${objectiveId}/toggle`, {})
    refresh(projectId)
    return { ok: true, id: objective.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos marcar el objetivo.')
  }
}

// Las notas del proyecto, al salir del campo.
export async function saveProjectNotesAction(projectId: string, notes: string): Promise<ProjectActionResult> {
  if (!idSchema.safeParse(projectId).success) return failure(NOT_FOUND)
  try {
    await api.patch(`/projects/${projectId}/notes`, { notes })
    refresh(projectId)
    return { ok: true, id: projectId }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar las notas.')
  }
}

// La fecha meta elegida desde "Detalles". Null la quita.
export async function saveProjectGoalAction(projectId: string, goalOn: string | null): Promise<ProjectActionResult> {
  if (!idSchema.safeParse(projectId).success) return failure(NOT_FOUND)
  try {
    await api.patch(`/projects/${projectId}/goal`, { goalOn })
    refresh(projectId)
    return { ok: true, id: projectId }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar la fecha meta.')
  }
}

// Una tarea nueva en este proyecto (el campo "Agregar tarea a este proyecto…"). La crea la API de Tareas con el
// proyecto puesto; devuelve la tarea con su id real para reemplazar la de la pantalla.
export async function createProjectTaskAction(projectId: string, title: string): Promise<{ ok: true; task: ProjectTask } | { ok: false; message: string }> {
  const trimmed = title.trim()
  if (!idSchema.safeParse(projectId).success) return { ok: false, message: NOT_FOUND }
  if (trimmed === '') return { ok: false, message: 'Escribe qué hay que hacer.' }
  try {
    const task = await api.post<Task>('/tasks', { title: trimmed, projectId, status: 'todo', priority: 'medium', dueOn: null, subtasks: [], notes: null })
    refresh(projectId)
    return { ok: true, task: { id: task.id, title: task.title, status: task.status, subtasksDone: 0, subtasksTotal: 0, dueOn: task.dueOn } }
  } catch (error) {
    return { ok: false, message: error instanceof ApiError ? error.message : 'No pudimos crear la tarea. Intenta de nuevo.' }
  }
}

// Marca como hecha una tarea del proyecto, o la regresa a donde estaba (también sirve para mover una tarjeta del
// tablero del sprint). El estado lo cambia la API de Tareas.
export async function setProjectTaskStatusAction(projectId: string, taskId: string, status: TaskStatus): Promise<ProjectActionResult> {
  if (!idSchema.safeParse(projectId).success || !idSchema.safeParse(taskId).success) return failure('No encontramos esa tarea.')
  try {
    await api.patch(`/tasks/${taskId}`, { status })
    refresh(projectId)
    return { ok: true, id: taskId }
  } catch (error) {
    return apiFailure(error, 'No pudimos actualizar la tarea.')
  }
}

// Un enlace suelto desde la pestaña Archivos.
export async function addProjectLinkAction(projectId: string, raw: unknown): Promise<{ ok: true; link: ProjectLink } | { ok: false; errors: Record<string, string>; message?: string }> {
  if (!idSchema.safeParse(projectId).success) return { ok: false, errors: {}, message: NOT_FOUND }
  const parsed = projectLinkSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }
  try {
    const link = await api.post<ProjectLink>(`/projects/${projectId}/links`, parsed.data)
    refresh(projectId)
    return { ok: true, link }
  } catch (error) {
    return { ok: false, errors: {}, message: error instanceof ApiError ? error.message : 'No pudimos guardar el enlace.' }
  }
}

// --- Sprints ---------------------------------------------------------------------------------------

export async function startSprintAction(projectId: string, raw: unknown): Promise<ProjectActionResult> {
  if (!idSchema.safeParse(projectId).success) return failure(NOT_FOUND)
  const parsed = startSprintSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }
  try {
    const sprint = await api.post<SprintRecord>(`/projects/${projectId}/sprints/start`, parsed.data)
    refresh(projectId)
    return { ok: true, id: sprint.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos empezar el sprint. Intenta de nuevo.')
  }
}

// Cierra el sprint activo y empieza el siguiente: la API lo hace todo en una sola transacción.
export async function closeSprintAction(projectId: string, raw: unknown): Promise<ProjectActionResult> {
  if (!idSchema.safeParse(projectId).success) return failure(NOT_FOUND)
  const parsed = closeSprintSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }
  try {
    const result = await api.post<{ active: SprintRecord }>(`/projects/${projectId}/sprints/close`, parsed.data)
    refresh(projectId)
    return { ok: true, id: result.active.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos cerrar el sprint. Intenta de nuevo.')
  }
}

// Mete una tarea del backlog al sprint activo.
export async function addSprintTaskAction(projectId: string, taskId: string): Promise<ProjectActionResult> {
  if (!idSchema.safeParse(projectId).success) return failure(NOT_FOUND)
  const parsed = addSprintTaskSchema.safeParse({ taskId })
  if (!parsed.success) return failure('No encontramos esa tarea.')
  try {
    await api.post(`/projects/${projectId}/sprints/tasks`, parsed.data)
    refresh(projectId)
    return { ok: true, id: taskId }
  } catch (error) {
    return apiFailure(error, 'No pudimos agregar la tarea al sprint.')
  }
}
