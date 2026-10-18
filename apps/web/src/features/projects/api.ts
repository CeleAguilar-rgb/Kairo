import 'server-only'

import { cache } from 'react'

import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildFiles, emptyFiles } from './mock-files'
import { buildProjectDetails, toProject } from './mock'
import { buildSprints } from './mock-sprints'
import { applyStore } from './mock-store'
import type { Project, ProjectDetail, ProjectFiles, ProjectSprints } from './types'

// Hoy devuelven datos de ejemplo. Con la API: `return api.get<Project[]>('/projects')`.
export async function listProjects(): Promise<Project[]> {
  const ctx = await getMockContext()
  await mockDelay()
  return applyStore(buildProjectDetails(ctx)).map(toProject)
}

export async function listActiveProjects(): Promise<Project[]> {
  const projects = await listProjects()
  return projects.filter((project) => project.status === 'active')
}

// null si el proyecto no existe (la API responde 404; la página muestra "no encontrado").
// cache(): el layout del proyecto y su pestaña lo piden en el mismo request y React lo
// deduplica en vez de llamar dos veces. Con la API: `api.get<ProjectDetail>(`/projects/${id}`)`.
export const getProject = cache(async (id: string): Promise<ProjectDetail | null> => {
  const ctx = await getMockContext()
  await mockDelay()
  return applyStore(buildProjectDetails(ctx)).find((project) => project.id === id) ?? null
})

// Un proyecto sin sprints (uno recién creado) devuelve todo vacío. Con la API: `/projects/:id/sprints`.
export async function getProjectSprints(id: string): Promise<ProjectSprints> {
  const ctx = await getMockContext()
  await mockDelay()
  return buildSprints(ctx)[id] ?? { active: null, tasks: [], backlog: [], closed: [] }
}

// Con la API: `/projects/:id/attachments`.
export async function getProjectFiles(id: string): Promise<ProjectFiles> {
  const ctx = await getMockContext()
  await mockDelay()
  return buildFiles(ctx)[id] ?? emptyFiles()
}
