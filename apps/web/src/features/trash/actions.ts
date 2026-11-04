'use server'

import { trashRefSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api, ApiError } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'

// Las acciones de la Papelera. Una Server Action es un endpoint público: el tipo y el id se vuelven a validar con el
// esquema compartido (regla 4) y la API revisa que sean de la persona (regla 3). Restaurar o borrar algo puede
// cambiar cualquier pantalla, así que se revalida todo el dashboard.
export type TrashActionResult = { ok: true } | { ok: false; message: string }

const DEMO_MESSAGE = 'En el modo demo no se guarda nada: es solo para mirar.'

async function run(fallback: string, call: () => Promise<unknown>): Promise<TrashActionResult> {
  if (DEMO_MODE) return { ok: false, message: DEMO_MESSAGE }
  try {
    await call()
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (error) {
    return { ok: false, message: error instanceof ApiError ? error.message : fallback }
  }
}

export async function restoreFromTrashAction(raw: unknown): Promise<TrashActionResult> {
  const parsed = trashRefSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, message: 'No pudimos restaurarlo.' }
  const { kind, id } = parsed.data
  return run('No pudimos restaurarlo. Intenta de nuevo.', () => api.post(`/trash/${kind}/${id}/restore`, {}))
}

export async function purgeFromTrashAction(raw: unknown): Promise<TrashActionResult> {
  const parsed = trashRefSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, message: 'No pudimos borrarlo.' }
  const { kind, id } = parsed.data
  return run('No pudimos borrarlo. Intenta de nuevo.', () => api.delete(`/trash/${kind}/${id}`))
}

export async function emptyTrashAction(): Promise<TrashActionResult> {
  return run('No pudimos vaciar la papelera. Intenta de nuevo.', () => api.delete('/trash'))
}

// Borrar un proyecto (Borrar.dc.html): a la papelera con sus tareas, eventos, sprints y archivos.
export async function trashProjectAction(projectId: unknown): Promise<TrashActionResult> {
  const parsed = trashRefSchema.safeParse({ kind: 'project', id: projectId })
  if (!parsed.success) return { ok: false, message: 'No pudimos borrar el proyecto.' }
  return run('No pudimos borrar el proyecto. Intenta de nuevo.', () => api.post(`/trash/project/${parsed.data.id}`, {}))
}
