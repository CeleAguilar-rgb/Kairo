'use server'

import type { CreateTaskInput, TaskStatus } from '@kairo/shared'
import { revalidatePath } from 'next/cache'
import { api, ApiError } from '@/lib/api-client'

import type { Task } from './types'

type ActionResult<T> = T | { error: string }

function toActionError(error: unknown, fallback: string): { error: string } {
  return { error: error instanceof ApiError ? error.message : fallback }
}

// Devuelve la tarea creada (con su id real y los de sus subtareas): la
// pantalla la necesita para reemplazar el formulario por la tarjeta de
// verdad, en vez de inventar un id que luego no existiría en la base.
export async function createTask(
  input: CreateTaskInput,
): Promise<ActionResult<{ task: Task }>> {
  try {
    const task = await api.post<Task>('/tasks', input)
    revalidatePath('/tareas')
    revalidatePath('/')
    return { task }
  } catch (error) {
    return toActionError(error, 'No pudimos crear la tarea. Intenta de nuevo.')
  }
}

// Sirve para una tarea o una subtarea (las dos son filas de tasks en la API):
// mover una tarjeta en el tablero, marcarla hecha desde el detalle, o
// alternar una subtarea.
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<ActionResult<{ task: Task }>> {
  try {
    const task = await api.patch<Task>(`/tasks/${taskId}`, { status })
    // También '/': la tarjeta "Pendientes de hoy" de Inicio puede mostrar la misma tarea.
    revalidatePath('/tareas')
    revalidatePath('/')
    return { task }
  } catch (error) {
    return toActionError(error, 'No pudimos actualizar la tarea.')
  }
}

// Papelera (docs/guides/design.md, patrón "Borrar"): se va la tarea y sus
// subtareas juntas. El aviso que sigue ofrece "Deshacer" con restoreTask.
export async function deleteTask(
  taskId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    await api.delete(`/tasks/${taskId}`)
    revalidatePath('/tareas')
    revalidatePath('/')
    return { ok: true }
  } catch (error) {
    return toActionError(error, 'No pudimos borrar la tarea.')
  }
}

export async function restoreTask(
  taskId: string,
): Promise<ActionResult<{ task: Task }>> {
  try {
    const task = await api.post<Task>(`/tasks/${taskId}/restore`, {})
    revalidatePath('/tareas')
    revalidatePath('/')
    return { task }
  } catch (error) {
    return toActionError(error, 'No pudimos recuperar la tarea.')
  }
}
