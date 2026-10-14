import 'server-only'

import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildProjects } from './mock'
import type { Project } from './types'

export async function listProjects(): Promise<Project[]> {
  const ctx = await getMockContext()
  await mockDelay()
  return buildProjects(ctx)
}

export async function listActiveProjects(): Promise<Project[]> {
  const projects = await listProjects()
  return projects.filter((project) => project.status === 'active')
}
