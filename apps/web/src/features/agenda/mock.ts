import 'server-only'

import { addDays, startOfWeek, zonedToUtc } from '@/lib/dates'
import type { MockContext } from '@/lib/mock/context'
import { PROJECT_ID } from '@/lib/mock/ids'

import type { AgendaEvent, EventKind } from './types'

type Seed = {
  id: string
  // Día de la semana, 0 = lunes … 6 = domingo (como el canvas)
  weekday: number
  start: string
  minutes: number
  title: string
  kind: EventKind
  place?: string
  project?: { id: string; name: string }
}

// "Esta semana" de Main.dc.html: los eventos van atados al día de la semana,
// no a una fecha fija, para que la semana actual siempre tenga algo.
const SEEDS: Seed[] = [
  { id: 'e1', weekday: 0, start: '08:00', minutes: 120, title: 'Meal prep de la semana', kind: 'personal', place: 'Casa' },
  { id: 'e2', weekday: 2, start: '11:00', minutes: 45, title: 'Revisión del bot con mi jefe', kind: 'work', project: { id: PROJECT_ID.bot, name: 'Bot de marketing' } },
  { id: 'e3', weekday: 2, start: '16:00', minutes: 120, title: 'Bloque de enfoque', kind: 'personal', project: { id: PROJECT_ID.dash, name: 'Dashboard personal' } },
  { id: 'e4', weekday: 2, start: '20:30', minutes: 60, title: 'Escribir', kind: 'personal', place: 'Escritos' },
  { id: 'e5', weekday: 3, start: '10:30', minutes: 30, title: 'Daily', kind: 'work' },
  { id: 'e6', weekday: 3, start: '17:00', minutes: 90, title: 'Avanzar escuela', kind: 'personal', place: 'Rutina · Enfoque' },
  { id: 'e7', weekday: 3, start: '18:00', minutes: 120, title: 'Partida con amigos', kind: 'personal' },
  { id: 'e8', weekday: 4, start: '10:00', minutes: 60, title: 'Entrega de avance', kind: 'work' },
  { id: 'e9', weekday: 6, start: '12:00', minutes: 180, title: 'Comida familiar', kind: 'personal' },
]

export function buildWeekEvents(ctx: MockContext): AgendaEvent[] {
  const monday = startOfWeek(ctx.today, 'monday')
  return SEEDS.map((seed) => {
    const date = addDays(monday, seed.weekday)
    const startsAt = zonedToUtc(date, seed.start, ctx.timeZone)
    return {
      id: seed.id,
      title: seed.title,
      kind: seed.kind,
      startsAt,
      endsAt: new Date(Date.parse(startsAt) + seed.minutes * 60_000).toISOString(),
      allDay: false,
      notes: null,
      project: seed.project ?? null,
      place: seed.place ?? null,
    }
  })
}
