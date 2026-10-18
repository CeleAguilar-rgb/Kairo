'use server'

import type { CreateTaskInput } from '@kairo/shared'
import { revalidatePath } from 'next/cache'
import { api, ApiError } from '@/lib/api-client'

type ActionResult = { error: string } | undefined

function toActionError(error: unknown, fallback: string): ActionResult {
  return { error: error instanceof ApiError ? error.message : fallback }
}

export async function createTask(input: CreateTaskInput): Promise<ActionResult> {
  try {
    await api.post('/tasks', input)
  } catch (error) {
    return toActionError(error, 'No pudimos crear la tarea. Intenta de nuevo.')
  }

  revalidatePath('/tareas')
}

export async function completeTask(taskId: string): Promise<ActionResult> {
  try {
    await api.post(`/tasks/${taskId}/complete`, {})
  } catch (error) {
    return toActionError(error, 'No pudimos marcar la tarea como hecha.')
  }

  // También '/': la tarjeta "Pendientes de hoy" de Inicio puede ser quien
  // llamó a esta acción, o solo estar mostrando la misma tarea.
  revalidatePath('/tareas')
  revalidatePath('/')
}
