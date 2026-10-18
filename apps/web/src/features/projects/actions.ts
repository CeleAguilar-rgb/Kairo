'use server'

import { projectSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { getMockContext, mockDelay } from '@/lib/mock/context'

import { fieldErrors } from '@/lib/form-errors'
import { buildProjectDetails } from './mock'
import { createStoredProject, updateStoredProject } from './mock-store'

// Las acciones del formulario de proyecto. Una Server Action es un endpoint público: lo que
// llega NO se confía, se vuelve a validar con el mismo esquema del front (packages/shared).
// Con la API, en vez de las funciones de mock-store llaman a `api.post('/projects', parsed.data)`
// y `api.patch(`/projects/${id}`, parsed.data)`; el userId lo pone la API con el token (regla 2).
export type ProjectActionResult =
  | { ok: true; id: string }
  // `errors` va por campo ("name", "goalOn", "links.0.url"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

export async function createProjectAction(raw: unknown): Promise<ProjectActionResult> {
  const parsed = projectSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const project = createStoredProject(parsed.data)
  revalidatePath('/proyectos')
  return { ok: true, id: project.id }
}

export async function updateProjectAction(id: string, raw: unknown): Promise<ProjectActionResult> {
  const parsed = projectSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const ctx = await getMockContext()
  if (!updateStoredProject(id, parsed.data, buildProjectDetails(ctx))) {
    return { ok: false, errors: {}, message: 'No encontramos ese proyecto.' }
  }
  revalidatePath('/proyectos')
  revalidatePath(`/proyectos/${id}`)
  return { ok: true, id }
}
