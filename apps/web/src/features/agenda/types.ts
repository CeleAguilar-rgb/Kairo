import type { EventDeleteScope, EventKind, EventReminder, EventRepeat } from '@kairo/shared'

import type { IsoDate } from '@/lib/dates'

// Los tipos, repeticiones y avisos salen de packages/shared (los mismos que valida eventSchema).
export type { EventDeleteScope, EventKind, EventReminder, EventRepeat }

// Tabla events de docs/guides/data-model.md (camelCase). starts_at/ends_at son
// momentos en UTC; se muestran en la zona del perfil. Es la forma que devolverá la
// API y la que usa la tarjeta "Esta semana" de Inicio.
export type AgendaEvent = {
  id: string
  title: string
  kind: EventKind
  startsAt: string
  endsAt: string
  allDay: boolean
  notes: string | null
  project: { id: string; name: string } | null
  // "Lugar o enlace" del evento, o el texto corto de dónde sale ("Casa", "Rutina · Enfoque").
  place: string | null
}

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  work: 'Trabajo',
  personal: 'Personal',
  school: 'Escuela',
}

export const EVENT_REPEAT_LABEL: Record<EventRepeat, string> = {
  none: 'No se repite',
  daily: 'Cada día',
  weekdays: 'Lunes a viernes',
  weekly: 'Cada semana',
  monthly: 'Cada mes',
  yearly: 'Cada año',
}

export const EVENT_REMINDER_LABEL: Record<EventReminder, string> = {
  none: 'Sin aviso',
  '10m': '10 min antes',
  '1h': '1 hora antes',
  '1d': '1 día antes',
}

// "Te llegará un recordatorio 10 minutos antes."
export const EVENT_REMINDER_TEXT: Record<Exclude<EventReminder, 'none'>, string> = {
  '10m': '10 minutos antes',
  '1h': '1 hora antes',
  '1d': 'un día antes',
}

// Lo que dibuja la pantalla de Agenda: eventos, pagos de membresías y tareas con fecha, ya
// puestos en el día y la hora de la zona del perfil. Cada vez de una serie que se repite es una
// entrada (la API devuelve las ocurrencias del rango que se pide).
export type AgendaEntryType = EventKind | 'payment' | 'task'

export type AgendaEntry = {
  // Única por ocurrencia: "e12@2026-10-14" (evento), "ms1@2026-10-15" (pago), "task:t3" (tarea).
  id: string
  type: AgendaEntryType
  title: string
  date: IsoDate
  allDay: boolean
  // Minutos desde la medianoche, en la zona del perfil (null si dura todo el día).
  startMin: number | null
  endMin: number | null
  notes: string | null
  place: string | null
  project: { id: string; name: string } | null
  // Solo eventos
  eventId?: string
  repeat?: EventRepeat
  seriesStartsOn?: IsoDate
  reminder?: EventReminder
  // Solo pagos y tareas: el dato de apoyo ("Débito ••4417", "Tarea del proyecto Bot de marketing") y a dónde lleva.
  detail?: string
  href?: string
}

export function isEventEntry(entry: AgendaEntry): entry is AgendaEntry & { type: EventKind; eventId: string } {
  return entry.type !== 'payment' && entry.type !== 'task'
}
