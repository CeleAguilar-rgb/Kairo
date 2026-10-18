import 'server-only'

import { listUpcomingPayments } from '@/features/finance/api'
import { listTasks } from '@/features/tasks/api'
import { api } from '@/lib/api-client'
import { addDays, minutesToWallTime, startOfWeek, zonedToUtc, type IsoDate } from '@/lib/dates'
import { DEMO_MODE } from '@/lib/demo'
import { getMockContext, mockDelay } from '@/lib/mock/context'

import { paymentEntries, taskEntries } from './entries'
import { buildEventRecords } from './mock'
import { occurrenceDates, toEntry, type EventRecord } from './records'
import type { AgendaEntry, AgendaEvent } from './types'

// Las series de eventos (una fila por evento o por serie, no por vez que ocurre — decisión #37).
// Modo demo (sin Supabase ni API): datos de ejemplo. Fuera de él, la API real. Expandirlas a sus
// ocurrencias de un rango sigue pasando aquí (records.ts), no se duplica en el servidor.
async function loadRecords(): Promise<EventRecord[]> {
  if (DEMO_MODE) return buildEventRecords(await getMockContext())
  return api.get<EventRecord[]>('/events')
}

// Todo lo de la agenda en una ventana de fechas: eventos (con las veces que se repiten), cobros de
// membresías y tareas con fecha, ya puestos en el día y la hora de la zona del perfil. La ventana es
// de unos nueve meses alrededor de hoy: al navegar más lejos no hay nada.
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
// forma en que los devuelve la API (momentos UTC).
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
