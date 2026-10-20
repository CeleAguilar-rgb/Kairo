'use server'

import {
  createSubjectSchema,
  subjectGradesSchema,
  termSchema,
  type TaskStatus,
} from '@kairo/shared'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { api, ApiError } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import type { GradeField, Subject, Term } from './types'

// Las acciones de Escuela. Una Server Action es un endpoint público: lo que llega NO se confía, se vuelve a
// validar con el mismo esquema del front (packages/shared), y ese esquema también es el contrato de la API, que
// lo revisa otra vez. El userId lo pone la API con el token (regla 2) y toda consulta filtra por él (regla 3).
export type SchoolActionResult =
  | { ok: true; id?: string }
  // `errors` va por campo ("name", "endsOn"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

const failure = (message: string): SchoolActionResult => ({
  ok: false,
  errors: {},
  message,
})

// Un error de la API que es de un campo del formulario va junto a ese campo.
const FIELD_BY_CODE: Record<string, string> = { PROJECT_NOT_FOUND: 'prepProjectId' }

function apiFailure(error: unknown, fallback: string): SchoolActionResult {
  if (!(error instanceof ApiError)) return failure(fallback)
  const field = FIELD_BY_CODE[error.code]
  return field
    ? { ok: false, errors: { [field]: error.message } }
    : failure(error.message)
}

const idSchema = z.uuid()

// Crear o borrar una materia cambia también Agenda (sus clases), Proyectos (la materia es un proyecto), Tareas
// y Inicio. Marcar una entrega o un paso de la preparación es una tarea: Tareas, Proyectos e Inicio la ven.
function refresh(scope: 'school' | 'subject' | 'task' = 'school') {
  revalidatePath('/escuela')
  if (scope === 'school') return
  revalidatePath('/tareas')
  revalidatePath('/')
  revalidatePath('/proyectos')
  if (scope === 'subject') revalidatePath('/agenda')
}

// --- Materias -------------------------------------------------------------------------------------

// `termId` lo manda la pantalla (conoce el periodo actual); la API revisa que sea del usuario.
export async function createSubjectAction(
  raw: unknown,
  termId: string | null,
): Promise<SchoolActionResult> {
  const parsed = createSubjectSchema.safeParse(raw)
  if (!parsed.success)
    return { ok: false, errors: fieldErrors(parsed.error.issues) }
  if (termId !== null && !idSchema.safeParse(termId).success)
    return failure('No encontramos ese periodo.')

  try {
    const subject = await api.post<Subject>('/school/subjects', {
      ...parsed.data,
      termId,
    })
    refresh('subject')
    return { ok: true, id: subject.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos crear la materia. Intenta de nuevo.')
  }
}

export async function deleteSubjectAction(
  id: string,
): Promise<SchoolActionResult> {
  if (!idSchema.safeParse(id).success)
    return failure('Esa materia ya no existe.')
  try {
    await api.delete(`/school/subjects/${id}`)
    refresh('subject')
    return { ok: true }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404)
      return failure('Esa materia ya no existe.')
    return apiFailure(error, 'No pudimos borrar la materia. Intenta de nuevo.')
  }
}

// Una casilla de calificaciones a la vez (null la borra).
export async function setGradeAction(
  subjectId: string,
  field: GradeField,
  value: number | null,
): Promise<SchoolActionResult> {
  if (!idSchema.safeParse(subjectId).success)
    return failure('Esa materia ya no existe.')
  const parsed = subjectGradesSchema.safeParse({ [field]: value })
  if (!parsed.success)
    return failure(
      parsed.error.issues[0]?.message ?? 'La calificación no es válida.',
    )

  try {
    await api.patch(`/school/subjects/${subjectId}/grades`, parsed.data)
    refresh('school')
    return { ok: true }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404)
      return failure('Esa materia ya no existe.')
    return apiFailure(error, 'No pudimos guardar la calificación.')
  }
}

// --- Periodo --------------------------------------------------------------------------------------

// Sin `id` crea el periodo; con él, edita ese.
export async function saveTermAction(
  id: string | null,
  raw: unknown,
): Promise<SchoolActionResult> {
  if (id !== null && !idSchema.safeParse(id).success)
    return failure('No encontramos ese periodo.')
  const parsed = termSchema.safeParse(raw)
  if (!parsed.success)
    return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const term =
      id === null
        ? await api.post<Term>('/school/terms', parsed.data)
        : await api.patch<Term>(`/school/terms/${id}`, parsed.data)
    refresh('subject')
    return { ok: true, id: term.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar el periodo. Intenta de nuevo.')
  }
}

// --- Entregas y preparación: son tareas -----------------------------------------------------------

async function setTaskDone(
  id: string,
  done: boolean,
): Promise<SchoolActionResult> {
  if (!idSchema.safeParse(id).success) return failure('Esa tarea ya no existe.')
  const status: TaskStatus = done ? 'done' : 'todo'
  try {
    await api.patch(`/tasks/${id}`, { status })
    refresh('task')
    return { ok: true }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404)
      return failure('Esa tarea ya no existe.')
    return apiFailure(error, 'No pudimos guardar el cambio. Intenta de nuevo.')
  }
}

export async function setAssignmentDoneAction(
  id: string,
  done: boolean,
): Promise<SchoolActionResult> {
  return setTaskDone(id, done)
}

export async function setPrepItemDoneAction(
  id: string,
  done: boolean,
): Promise<SchoolActionResult> {
  return setTaskDone(id, done)
}
