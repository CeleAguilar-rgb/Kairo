import 'server-only'

import type { MockContext } from '@/lib/mock/context'
import { PROJECT_ID } from '@/lib/mock/ids'

import { buildProjectDetails } from './mock'
import type { BacklogTask, ProjectSprints, Sprint, SprintTask } from './types'

// Datos de ejemplo de la pestaña Sprints (ProyectoSprints.dc.html). "Dashboard personal" lleva los
// del canvas; Bot de marketing y 67downloader tienen su propio sprint; los demás proyectos no
// tienen sprint activo y su backlog son sus tareas pendientes. Los días son relativos a "hoy".

type TaskSeed = [title: string, status: SprintTask['status'], subtasksDone: number, subtasksTotal: number, due: number | null]

type ClosedSeed = { number: number; goal: string; starts: number; ends: number; done: number; total: number; notes: string | null }

type SprintSeed = {
  number: number
  goal: string
  starts: number
  ends: number
  tasks: TaskSeed[]
  backlog: string[]
  closed: ClosedSeed[]
}

const SEEDS: Partial<Record<keyof typeof PROJECT_ID, SprintSeed>> = {
  dash: {
    number: 2,
    goal: 'Cerrar el diseño y dejar listo el arranque del código.',
    starts: -7,
    ends: 5,
    tasks: [
      ['Pantalla de Inicio', 'done', 5, 5, null],
      ['Terminar el diseño del dashboard', 'in_progress', 2, 3, 0],
      ['Sección de Escritos y personajes', 'in_progress', 1, 4, 1],
      ['Elegir stack y estructura de carpetas', 'done', 3, 3, null],
      ['Esquema de base de datos en Supabase', 'todo', 0, 3, 3],
      ['Login con correo', 'todo', 0, 2, null],
    ],
    backlog: ['Pomodoro y barra de Spotify', 'Conexión con Notion', 'Instalar en el celular (PWA)', 'Recordatorios de pagos automáticos'],
    closed: [
      { number: 1, goal: 'Definir las secciones y el modelo de datos.', starts: -14, ends: -8, done: 4, total: 5, notes: 'Escritos no alcanzó; pasó al sprint 2.' },
    ],
  },
  bot: {
    number: 1,
    goal: 'Dejar la arquitectura lista para el segundo bot.',
    starts: -5,
    ends: 8,
    tasks: [
      ['Documentar la arquitectura actual', 'done', 3, 3, null],
      ['Revisar la arquitectura del bot', 'in_progress', 1, 3, 0],
      ['Propuesta de módulos', 'in_progress', 3, 3, 2],
    ],
    backlog: ['Plantilla base para nuevos bots'],
    closed: [],
  },
  d67: {
    number: 3,
    goal: 'Sumar más redes y probarlo con un usuario real.',
    starts: -4,
    ends: 9,
    tasks: [
      ['Historial de descargas', 'done', 3, 3, null],
      ['Soporte para más redes', 'in_progress', 2, 3, 9],
      ['Pruebas con Tatalan', 'todo', 1, 2, 2],
    ],
    backlog: [],
    closed: [
      { number: 2, goal: 'Interfaz principal y descargas de TikTok.', starts: -18, ends: -5, done: 3, total: 4, notes: 'Faltó probar TikTok en el celular.' },
      { number: 1, goal: 'Descargar desde YouTube.', starts: -32, ends: -19, done: 4, total: 4, notes: null },
    ],
  },
}

export function buildSprints(ctx: MockContext): Record<string, ProjectSprints> {
  const bySeed = new Map(buildProjectDetails(ctx).map((detail) => [detail.id, detail]))
  const result: Record<string, ProjectSprints> = {}

  for (const key of Object.keys(PROJECT_ID) as (keyof typeof PROJECT_ID)[]) {
    const id = PROJECT_ID[key]
    const seed = SEEDS[key]

    if (!seed) {
      // Sin sprint: el backlog son las tareas que faltan por hacer.
      const pending = bySeed.get(id)?.tasks.filter((task) => task.status !== 'done') ?? []
      result[id] = { active: null, tasks: [], backlog: pending.map((task) => ({ id: task.id, title: task.title })), closed: [] }
      continue
    }

    const tasks: SprintTask[] = seed.tasks.map(([title, status, subtasksDone, subtasksTotal, due], index) => ({
      id: `${key}-sprint-task-${index + 1}`,
      title,
      status,
      dueOn: due === null ? null : ctx.day(due),
      subtasksDone,
      subtasksTotal,
    }))
    const backlog: BacklogTask[] = seed.backlog.map((title, index) => ({ id: `${key}-backlog-${index + 1}`, title }))
    const active: Sprint = {
      id: `${key}-sprint-${seed.number}`,
      number: seed.number,
      goal: seed.goal,
      startsOn: ctx.day(seed.starts),
      endsOn: ctx.day(seed.ends),
      notes: null,
      doneCount: tasks.filter((task) => task.status === 'done').length,
      totalCount: tasks.length,
    }
    const closed: Sprint[] = seed.closed.map((sprint) => ({
      id: `${key}-sprint-${sprint.number}`,
      number: sprint.number,
      goal: sprint.goal,
      startsOn: ctx.day(sprint.starts),
      endsOn: ctx.day(sprint.ends),
      notes: sprint.notes,
      doneCount: sprint.done,
      totalCount: sprint.total,
    }))
    result[id] = { active, tasks, backlog, closed }
  }

  return result
}
