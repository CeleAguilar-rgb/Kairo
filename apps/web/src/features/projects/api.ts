import 'server-only'

import { cache } from 'react'

import { listTasks } from '@/features/tasks/api'
import { api, ApiError } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildFiles, emptyFiles } from './mock-files'
import { buildProjectDetails, toProject } from './mock'
import { buildSprints } from './mock-sprints'
import { toProjectDetail, toProjectSprints, withTaskStats } from './project-utils'
import type { Project, ProjectDetail, ProjectDetailRecord, ProjectFiles, ProjectRecord, ProjectSprints, ProjectSprintsRecord } from './types'

// Lecturas de Proyectos. La API devuelve hechos crudos (decisión #38, igual que Finanzas, Agenda y Día a día): los
// proyectos con sus objetivos y enlaces, y los sprints con los ids de sus tareas. El avance, el conteo de tareas,
// el tablero del sprint y el backlog los arma este archivo con la lista de Tareas (project-utils.ts).
// Modo demo (lib/demo.ts): no hay Supabase ni API, se arman los datos de ejemplo (mock.ts), frescos en cada lectura.

// La lista de tareas se pide una sola vez por página aunque la usen varias lecturas (el layout y la pestaña).
const loadTasks = cache(() => listTasks())

export async function listProjects(): Promise<Project[]> {
  if (DEMO_MODE) {
    const ctx = await getMockContext()
    await mockDelay()
    return buildProjectDetails(ctx).map(toProject)
  }
  const [records, tasks] = await Promise.all([api.get<ProjectRecord[]>('/projects'), loadTasks()])
  return records.map((record) => withTaskStats(record, tasks))
}

export async function listActiveProjects(): Promise<Project[]> {
  const projects = await listProjects()
  return projects.filter((project) => project.status === 'active')
}

// null si el proyecto no existe (la API responde 404; la página muestra "no encontrado").
// cache(): el layout del proyecto y su pestaña lo piden en el mismo request y React lo deduplica en vez de
// llamar dos veces.
export const getProject = cache(async (id: string): Promise<ProjectDetail | null> => {
  if (DEMO_MODE) {
    const ctx = await getMockContext()
    await mockDelay()
    return buildProjectDetails(ctx).find((project) => project.id === id) ?? null
  }
  try {
    const [record, sprints, tasks] = await Promise.all([
      api.get<ProjectDetailRecord>(`/projects/${id}`),
      api.get<ProjectSprintsRecord>(`/projects/${id}/sprints`),
      loadTasks(),
    ])
    return toProjectDetail(record, tasks, sprints)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
})

// Un proyecto sin sprints (uno recién creado) devuelve todo vacío.
export async function getProjectSprints(id: string): Promise<ProjectSprints> {
  if (DEMO_MODE) {
    const ctx = await getMockContext()
    await mockDelay()
    return buildSprints(ctx)[id] ?? { active: null, tasks: [], backlog: [], closed: [] }
  }
  const [record, tasks] = await Promise.all([api.get<ProjectSprintsRecord>(`/projects/${id}/sprints`), loadTasks()])
  return toProjectSprints(record, id, tasks)
}

// Archivos: en modo real ya hay Storage (decisión #44); la API devuelve los archivos del proyecto
// más lo que ocupan los demás (el espacio es uno solo).
export async function getProjectFiles(id: string): Promise<ProjectFiles> {
  if (DEMO_MODE) {
    const ctx = await getMockContext()
    await mockDelay()
    return buildFiles(ctx)[id] ?? emptyFiles()
  }
  const record = await api.get<{ files: Omit<ProjectFiles['files'][number], 'look'>[]; usedElsewhereBytes: number; quotaBytes: number }>(
    `/projects/${id}/attachments`,
  )
  return { ...record, files: record.files.map((file) => ({ ...file, look: null })) }
}
