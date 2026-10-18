import 'server-only'

import { getMockContext, mockDelay } from '@/lib/mock/context'

import {
  buildAssignments,
  buildPrepItems,
  buildSubjects,
  PREP_DAYS_LEFT,
} from './mock'
import { applySubjects, doneOverride } from './mock-store'
import type { Assignment, PrepItem, Subject } from './types'

export type SchoolData = {
  subjects: Subject[]
  assignments: Assignment[]
  prepItems: PrepItem[]
  prepDaysLeft: number
  today: string
}

// Todo lo de Escuela de un jalón: la pantalla tiene varias pestañas que
// comparten las mismas materias y entregas, así que se piden juntas una vez
// (con la API: un solo api.get('/school') o varias peticiones en paralelo).
export async function getSchoolData(): Promise<SchoolData> {
  const ctx = await getMockContext()
  await mockDelay()

  const subjects = applySubjects(buildSubjects())
  const subjectIds = new Set(subjects.map((subject) => subject.id))

  const assignments = buildAssignments(ctx)
    .filter((assignment) => subjectIds.has(assignment.subjectId))
    .map((assignment) => ({
      ...assignment,
      done: doneOverride(assignment.id) ?? assignment.done,
    }))

  const prepItems = buildPrepItems().map((item) => ({
    ...item,
    done: doneOverride(item.id) ?? item.done,
  }))

  return {
    subjects,
    assignments,
    prepItems,
    prepDaysLeft: PREP_DAYS_LEFT,
    today: ctx.today,
  }
}
