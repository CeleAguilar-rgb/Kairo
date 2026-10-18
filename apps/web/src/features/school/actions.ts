'use server'

import { createSubjectSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'

import {
  addSubject,
  deleteSubject,
  isSubjectDeleted,
  overrideDone,
} from './mock-store'
import type { Subject } from './types'

// Las acciones de Escuela. Una Server Action es un endpoint público: lo que
// llega NO se confía, se vuelve a validar con el mismo esquema del front
// (packages/shared). Con la API, en vez de mock-store llaman a
// `api.post('/school/subjects', parsed.data)` y compañía.
export type SchoolActionResult =
  | { ok: true; id?: string }
  | { ok: false; errors: Record<string, string>; message?: string }

function refresh() {
  revalidatePath('/escuela')
}

export async function createSubjectAction(
  raw: unknown,
): Promise<SchoolActionResult> {
  const parsed = createSubjectSchema.safeParse(raw)
  if (!parsed.success)
    return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const subject: Subject = {
    id: crypto.randomUUID(),
    name: parsed.data.name,
    teacher: parsed.data.teacher,
    color: parsed.data.color,
    days: parsed.data.days,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
    room: parsed.data.room,
    grades: { midterm1: null, midterm2: null, final: null },
  }
  addSubject(subject)
  refresh()
  return { ok: true, id: subject.id }
}

export async function deleteSubjectAction(
  id: string,
): Promise<SchoolActionResult> {
  await mockDelay()
  if (isSubjectDeleted(id))
    return { ok: false, errors: {}, message: 'Esa materia ya no existe.' }
  deleteSubject(id)
  refresh()
  return { ok: true }
}

export async function setAssignmentDoneAction(
  id: string,
  done: boolean,
): Promise<SchoolActionResult> {
  await mockDelay()
  overrideDone(id, done)
  refresh()
  return { ok: true }
}

export async function setPrepItemDoneAction(
  id: string,
  done: boolean,
): Promise<SchoolActionResult> {
  await mockDelay()
  overrideDone(id, done)
  refresh()
  return { ok: true }
}
