import 'server-only'

import { listEventRecords } from '@/features/agenda/api'
import { listTasks } from '@/features/tasks/api'
import { api } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { getMockContext, mockDelay } from '@/lib/mock/context'

import {
  buildAssignments,
  buildPrepItems,
  buildSubjects,
  buildTerm,
  PREP_DAYS_LEFT,
} from './mock'
import {
  daysUntilStart,
  pickCurrentTerm,
  toAssignments,
  toPrepItems,
  toSubjects,
  visibleSubjects,
} from './school-utils'
import type {
  Assignment,
  PrepItem,
  ProjectRef,
  SchoolMode,
  Subject,
  SubjectRecord,
  Term,
} from './types'

export type SchoolData = {
  term: Term | null
  subjects: Subject[]
  assignments: Assignment[]
  prepItems: PrepItem[]
  // Los proyectos entre los que se puede elegir el de preparación al definir el periodo.
  projectOptions: ProjectRef[]
  // Días que faltan para que empiece el periodo; null si ya empezó o no hay periodo.
  daysLeft: number | null
  initialMode: SchoolMode
  goalLabel: string
  today: string
}

// Lo que sale de GET /projects que Escuela necesita para ofrecer el proyecto de preparación.
type ProjectListRecord = { id: string; name: string; status: string }

// Todo lo de Escuela de un jalón: la pantalla tiene varias pestañas que comparten las mismas materias y
// entregas, así que se piden juntas una vez. La API de Escuela solo devuelve lo propio (periodos y materias con
// sus calificaciones); el horario sale de los eventos de Agenda, las entregas y la preparación de Tareas
// (decisión #38: el Next.js de en medio arma lo que cruza módulos).
// Modo demo (lib/demo.ts): no hay Supabase ni API, así que se arman los datos de ejemplo (mock.ts).
export async function getSchoolData(): Promise<SchoolData> {
  const ctx = await getMockContext()

  if (DEMO_MODE) {
    await mockDelay()
    const term = buildTerm(ctx)
    return {
      term,
      subjects: buildSubjects(),
      assignments: buildAssignments(ctx),
      prepItems: buildPrepItems(),
      projectOptions: term.prepProject ? [term.prepProject] : [],
      daysLeft: PREP_DAYS_LEFT,
      initialMode: 'term',
      goalLabel: 'Meta: Entrar a la ingeniería',
      today: ctx.today,
    }
  }

  const [terms, subjectRecords, events, tasks, projectList] = await Promise.all(
    [
      api.get<Term[]>('/school/terms'),
      api.get<SubjectRecord[]>('/school/subjects'),
      listEventRecords(),
      listTasks(),
      api.get<ProjectListRecord[]>('/projects'),
    ],
  )

  const term = pickCurrentTerm(terms, ctx.today)
  const allSubjects = toSubjects(subjectRecords, events)
  const subjects = visibleSubjects(allSubjects, term)
  const prepProject = term?.prepProject ?? null

  // Un proyecto que ya es una materia no es el de preparación. El que ya está elegido siempre aparece.
  const subjectProjects = new Set(allSubjects.map((subject) => subject.projectId))
  const projectOptions = projectList
    .filter(
      (project) =>
        !subjectProjects.has(project.id) &&
        (project.status !== 'archived' || project.id === prepProject?.id),
    )
    .map(({ id, name }) => ({ id, name }))

  const daysLeft = daysUntilStart(term, ctx.today)
  return {
    term,
    subjects,
    assignments: toAssignments(tasks, subjects, ctx.today),
    prepItems: prepProject ? toPrepItems(tasks, prepProject.id) : [],
    projectOptions,
    daysLeft,
    // Antes de que empiece el periodo, lo que importa es prepararse.
    initialMode: daysLeft !== null ? 'prep' : 'term',
    goalLabel: 'Ver mis metas',
    today: ctx.today,
  }
}
