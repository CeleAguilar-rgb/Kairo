import { addDays, addMonths, diffDays, weekdayOf, type IsoDate } from '@/lib/dates'

import type { AgendaEntry, EventDeleteScope, EventKind, EventReminder, EventRepeat } from './types'

// Un evento tal como se guarda: UNA fila por evento o serie ("cada semana"), no una por vez que ocurre.
// Las ocurrencias de un rango se calculan al pedirlas (occurrenceDates). Es lógica pura, sin React ni
// servidor: con la API, esto vive en el servidor y el front solo recibe las entradas del rango.
export type EventRecord = {
  id: string
  title: string
  kind: EventKind
  // El primer día en que ocurre (el único, si no se repite).
  date: IsoDate
  allDay: boolean
  // Minutos desde la medianoche, en la zona del perfil (null si dura todo el día).
  startMin: number | null
  endMin: number | null
  notes: string | null
  place: string | null
  project: { id: string; name: string } | null
  repeat: EventRepeat
  reminder: EventReminder
  // La serie termina ese día, inclusive (null = sigue para siempre).
  until: IsoDate | null
  // Días de la serie que se borraron ("solo este").
  skip: IsoDate[]
}

// Los días, dentro de [from, to], en que ocurre el evento.
export function occurrenceDates(record: EventRecord, from: IsoDate, to: IsoDate): IsoDate[] {
  const last = record.until && record.until < to ? record.until : to
  const dates: IsoDate[] = []
  const add = (date: IsoDate) => {
    if (date >= from && date <= last && date >= record.date && !record.skip.includes(date)) dates.push(date)
  }

  switch (record.repeat) {
    case 'none':
      add(record.date)
      break
    case 'daily':
    case 'weekdays': {
      let date = from > record.date ? from : record.date
      for (; date <= last; date = addDays(date, 1)) {
        const weekday = weekdayOf(date)
        if (record.repeat === 'weekdays' && (weekday === 0 || weekday === 6)) continue
        add(date)
      }
      break
    }
    case 'weekly': {
      const behind = from > record.date ? Math.ceil(diffDays(record.date, from) / 7) : 0
      for (let date = addDays(record.date, behind * 7); date <= last; date = addDays(date, 7)) add(date)
      break
    }
    case 'monthly':
    case 'yearly': {
      const step = record.repeat === 'monthly' ? 1 : 12
      // Siempre se cuenta desde el primer día (no del anterior): un "31 de cada mes" vuelve al 31 en los meses largos.
      for (let k = 0; ; k++) {
        const date = addMonths(record.date, k * step)
        if (date > last) break
        add(date)
      }
      break
    }
  }
  return dates
}

// La entrada de Agenda de una vez que ocurre un evento.
export function toEntry(record: EventRecord, date: IsoDate): AgendaEntry {
  return {
    id: `${record.id}@${date}`,
    type: record.kind,
    title: record.title,
    date,
    allDay: record.allDay,
    startMin: record.startMin,
    endMin: record.endMin,
    notes: record.notes,
    place: record.place,
    project: record.project,
    eventId: record.id,
    repeat: record.repeat,
    seriesStartsOn: record.date,
    reminder: record.reminder,
  }
}

// Borra una vez, "esta y las siguientes" o toda la serie. Devuelve el registro cambiado, o null si
// ya no queda nada de él (un evento que no se repite, o una serie cuyo borrado alcanza hasta su primer día).
export function deleteFromRecord(record: EventRecord, scope: EventDeleteScope, occurrence: IsoDate): EventRecord | null {
  if (record.repeat === 'none' || scope === 'all') return null
  if (scope === 'one') return { ...record, skip: [...record.skip, occurrence] }
  // "Este y los siguientes": la serie termina el día anterior.
  const until = addDays(occurrence, -1)
  return until < record.date ? null : { ...record, until }
}
