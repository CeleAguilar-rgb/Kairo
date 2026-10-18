import 'server-only'

import { listUpcomingPayments } from '@/features/finance/api'
import { listTasks } from '@/features/tasks/api'
import { addDays, minutesToWallTime, startOfWeek, zonedToUtc, type IsoDate } from '@/lib/dates'
import { getMockContext, mockDelay } from '@/lib/mock/context'

import { paymentEntries, taskEntries } from './entries'
import { buildEventRecords } from './mock'
import { applyStore } from './mock-store'
import { occurrenceDates, toEntry, type EventRecord } from './records'
import type { AgendaEntry, AgendaEvent } from './types'

// Los eventos de ejemplo + lo que se creó o editó (mock-store). Con la API: una petición.
async function loadRecords(): Promise<EventRecord[]> {
  const ctx = await getMockContext()
  return applyStore(buildEventRecords(ctx))
}

// Todo lo de la agenda en una ventana de fechas: eventos (con las veces que se repiten), cobros de
// membresías y tareas con fecha, ya puestos en el día y la hora de la zona del perfil. La ventana es
// de unos nueve meses alrededor de hoy: al navegar más lejos no hay nada. Con la API la pantalla
// pedirá el rango que muestra: `api.get('/agenda?from=…&to=…')`.
export async function getAgendaEntries(): Promise<AgendaEntry[]> {
  const ctx = await getMockContext()
  await mockDelay()
  const from = addDays(ctx.today, -92)
  const to = addDays(ctx.today, 190)

  const [records, memberships, tasks] = await Promise.all([loadRecords(), listUpcomingPayments(), listTasks()])

  const entries: AgendaEntry[] = []
  for (const record of records) {
    for (const date of occurrenceDates(record, from, to)) entries.push(toEntry(record, date))
  }
  entries.push(...paymentEntries(memberships, from, to), ...taskEntries(tasks, from, to))
  return entries
}

// Los eventos de la semana de hoy, para la tarjeta "Esta semana" de Inicio: la misma agenda, en la
// forma en que los devolverá la API (momentos UTC). Con la API: `api.get('/events?from=…&to=…')`.
export async function listWeekEvents(): Promise<AgendaEvent[]> {
  const ctx = await getMockContext()
  await mockDelay()
  const monday = startOfWeek(ctx.today, 'monday')
  const sunday = addDays(monday, 6)

  const events: AgendaEvent[] = []
  for (const record of await loadRecords()) {
    for (const date of occurrenceDates(record, monday, sunday)) {
      events.push(toEvent(record, date, ctx.timeZone))
    }
  }
  return events.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

function toEvent(record: EventRecord, date: IsoDate, timeZone: string): AgendaEvent {
  const startsAt = zonedToUtc(date, minutesToWallTime(record.startMin ?? 0), timeZone)
  const endsAt = zonedToUtc(date, minutesToWallTime(Math.min(record.endMin ?? 24 * 60 - 1, 24 * 60 - 1)), timeZone)
  return {
    id: `${record.id}@${date}`,
    title: record.title,
    kind: record.kind,
    startsAt,
    endsAt,
    allDay: record.allDay,
    notes: record.notes,
    project: record.project,
    place: record.place,
  }
}
