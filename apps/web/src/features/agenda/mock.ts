import 'server-only'

import { addDays, startOfWeek, wallTimeToMinutes } from '@/lib/dates'
import type { MockContext } from '@/lib/mock/context'
import { PROJECT_ID } from '@/lib/mock/ids'

import type { EventRecord } from './records'
import type { EventKind, EventReminder, EventRepeat } from './types'

// Los eventos de ejemplo de Agenda.dc.html (y de la tarjeta "Esta semana" de Inicio, que lee de aquí:
// una sola fuente para que las dos pantallas no se contradigan). Van atados a la semana actual, no a
// una fecha fija: `week` es la semana relativa a la de hoy (0 = esta, -1 = la pasada, 1 = la próxima) y
// `weekday` el día (0 = lunes … 6 = domingo), así la semana de hoy siempre tiene algo.

const PROJECTS = {
  bot: { id: PROJECT_ID.bot, name: 'Bot de marketing' },
  dash: { id: PROJECT_ID.dash, name: 'Dashboard personal' },
  ing: { id: PROJECT_ID.ing, name: 'Ingeniería o maestría' },
} as const

type Seed = {
  id: string
  title: string
  kind: EventKind
  week: number
  weekday: number
  // null = dura todo el día
  start: string | null
  minutes?: number
  notes?: string
  place?: string
  project?: keyof typeof PROJECTS
  repeat?: EventRepeat
  reminder?: EventReminder
}

const SEEDS: Seed[] = [
  // Series: la fecha es la de su primera vez
  {
    id: 'daily',
    title: 'Daily',
    kind: 'work',
    week: -6,
    weekday: 1,
    start: '10:30',
    minutes: 30,
    notes: 'Seguimiento diario con el equipo. Llevar qué hice ayer, qué haré hoy y si algo me bloquea.',
    place: 'meet.google.com/qwe-rtyu-iop',
    project: 'bot',
    repeat: 'weekdays',
    reminder: '10m',
  },
  { id: 'gym', title: 'Gimnasio', kind: 'personal', week: -3, weekday: 5, start: '11:00', minutes: 90, notes: 'Pierna.', repeat: 'weekly', reminder: '1h' },
  { id: 'family', title: 'Comida familiar', kind: 'personal', week: -2, weekday: 6, start: '13:00', minutes: 150, notes: 'Casa de mi mamá.', place: 'Casa de mi mamá', repeat: 'weekly' },

  // La semana pasada
  { id: 'focus-prev', title: 'Bloque de enfoque', kind: 'work', week: -1, weekday: 1, start: '15:00', minutes: 120, notes: 'Separar módulos del bot de marketing.', project: 'bot' },
  { id: 'uni-call-prev', title: 'Llamada con la universidad', kind: 'school', week: -1, weekday: 3, start: '12:00', minutes: 30, place: 'meet.google.com/abc-defg-hij', project: 'ing' },

  // Esta semana (la del canvas: 5 al 11 de octubre)
  { id: 'meal-prep', title: 'Meal prep de la semana', kind: 'personal', week: 0, weekday: 0, start: '08:00', minutes: 120, notes: 'Recetario de lunes a viernes con lo que hay en casa.', place: 'Casa' },
  { id: 'focus', title: 'Bloque de enfoque', kind: 'work', week: 0, weekday: 1, start: '15:00', minutes: 120, notes: 'Separar módulos del bot de marketing.', project: 'bot' },
  {
    id: 'bot-review',
    title: 'Revisión del bot con mi jefe',
    kind: 'work',
    week: 0,
    weekday: 2,
    start: '11:00',
    minutes: 45,
    notes: 'Presentar el diagrama actual y la propuesta de módulos para los siguientes bots.',
    project: 'bot',
  },
  { id: 'dash-design', title: 'Diseño del dashboard', kind: 'personal', week: 0, weekday: 2, start: '16:00', minutes: 120, notes: 'Agenda y página de proyecto.', project: 'dash' },
  { id: 'write', title: 'Escribir', kind: 'personal', week: 0, weekday: 2, start: '20:30', minutes: 60, notes: 'Escena del capítulo 3, 500 palabras mínimo.', place: 'Escritos' },
  { id: 'game', title: 'Partida con amigos', kind: 'personal', week: 0, weekday: 3, start: '18:00', minutes: 150, notes: 'Cooperativo en línea.' },
  { id: 'delivery', title: 'Entrega de avance', kind: 'work', week: 0, weekday: 4, start: '10:00', minutes: 60, notes: 'Mostrar la plantilla base para nuevos bots.', project: 'bot', reminder: '1h' },
  { id: 'uni-call', title: 'Llamada con la universidad', kind: 'school', week: 0, weekday: 4, start: '12:00', minutes: 30, place: 'meet.google.com/abc-defg-hij', project: 'ing', reminder: '10m' },
  { id: 'dentist', title: 'Dentista', kind: 'personal', week: 0, weekday: 4, start: '17:00', minutes: 60, notes: 'Llegar 10 minutos antes.', reminder: '1d' },

  // La semana que viene y las siguientes
  { id: 'focus-next', title: 'Bloque de enfoque', kind: 'work', week: 1, weekday: 1, start: '09:00', minutes: 120, notes: 'Plantilla base para nuevos bots.', project: 'bot' },
  { id: 'enroll', title: 'Revisar inscripción', kind: 'school', week: 1, weekday: 2, start: '17:00', minutes: 60, notes: 'Requisitos de la ingeniería y la maestría para enero.', project: 'ing' },
  { id: 'cinema', title: 'Cine', kind: 'personal', week: 1, weekday: 4, start: '19:00', minutes: 120 },
  { id: 'sprint-planning', title: 'Planeación de sprint', kind: 'work', week: 2, weekday: 0, start: '10:00', minutes: 60, notes: 'Sprint 6 del bot de marketing.', project: 'bot' },
  { id: 'birthday', title: 'Cumpleaños', kind: 'personal', week: 2, weekday: 5, start: '12:00', minutes: 180 },
  { id: 'demo', title: 'Demo del dashboard', kind: 'personal', week: 3, weekday: 3, start: '16:00', minutes: 60, notes: 'Primera versión en código.', project: 'dash' },
]

export function buildEventRecords(ctx: MockContext): EventRecord[] {
  const monday = startOfWeek(ctx.today, 'monday')
  return SEEDS.map((seed) => {
    const startMin = seed.start === null ? null : wallTimeToMinutes(seed.start)
    return {
      id: seed.id,
      title: seed.title,
      kind: seed.kind,
      date: addDays(monday, seed.week * 7 + seed.weekday),
      allDay: seed.start === null,
      startMin,
      endMin: startMin === null ? null : startMin + (seed.minutes ?? 60),
      notes: seed.notes ?? null,
      place: seed.place ?? null,
      project: seed.project ? PROJECTS[seed.project] : null,
      repeat: seed.repeat ?? 'none',
      reminder: seed.reminder ?? 'none',
      until: null,
      skip: [],
    }
  })
}
