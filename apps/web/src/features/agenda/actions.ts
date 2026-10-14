'use server'

import { deleteEventSchema, eventSchema, moveEventSchema, type EventInput } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { listProjects } from '@/features/projects/api'
import { wallTimeToMinutes, type IsoDate } from '@/lib/dates'
import { fieldErrors } from '@/lib/form-errors'
import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildEventRecords } from './mock'
import { addRecord, findRecord, removeRecord, restoreFromTrash, saveRecord, toTrash } from './mock-store'
import { deleteFromRecord, type EventRecord } from './records'

// Las acciones de la Agenda. Una Server Action es un endpoint público: lo que llega NO se confía, se
// vuelve a validar con el mismo esquema del front (packages/shared). Con la API, en vez de las
// funciones de mock-store llaman a `api.post('/events', parsed.data)` y compañía; el userId lo pone la
// API con el token (regla 2) y toda consulta filtra por él (regla 3).
export type EventActionResult =
  | { ok: true; id?: string; undoToken?: string }
  // `errors` va por campo ("title", "endTime"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

const failure = (message: string): EventActionResult => ({ ok: false, errors: {}, message })

// Los eventos de ejemplo de hoy: de ahí se parte para saber qué existe.
async function seedRecords() {
  return buildEventRecords(await getMockContext())
}

// Lo que escribió la persona → el registro que se guarda (horas de pared a minutos, proyecto a su nombre).
async function recordFrom(input: EventInput, base: Pick<EventRecord, 'id' | 'until' | 'skip'>): Promise<EventRecord | string> {
  let project: EventRecord['project'] = null
  if (input.projectId) {
    const found = (await listProjects()).find((candidate) => candidate.id === input.projectId)
    if (!found) return 'Ese proyecto ya no existe.'
    project = { id: found.id, name: found.name }
  }
  return {
    ...base,
    title: input.title,
    kind: input.kind,
    date: input.date,
    allDay: input.allDay,
    startMin: input.allDay || !input.startTime ? null : wallTimeToMinutes(input.startTime),
    endMin: input.allDay || !input.endTime ? null : wallTimeToMinutes(input.endTime),
    notes: input.notes === '' ? null : input.notes,
    place: input.location || null,
    project,
    repeat: input.repeat,
    reminder: input.reminder,
  }
}

function refresh() {
  revalidatePath('/agenda')
  // La tarjeta "Esta semana" de Inicio lee de la misma agenda.
  revalidatePath('/')
}

export async function createEventAction(raw: unknown): Promise<EventActionResult> {
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const record = await recordFrom(parsed.data, { id: crypto.randomUUID(), until: null, skip: [] })
  if (typeof record === 'string') return failure(record)
  addRecord(record)
  refresh()
  return { ok: true, id: record.id }
}

// Edita el evento (si es una serie, toda la serie). Mover una sola vez de día es moveEventAction.
export async function updateEventAction(id: string, raw: unknown): Promise<EventActionResult> {
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const current = findRecord(id, await seedRecords())
  if (!current) return failure('No encontramos ese evento.')
  const record = await recordFrom(parsed.data, { id, until: current.until, skip: current.skip })
  if (typeof record === 'string') return failure(record)
  saveRecord(record)
  refresh()
  return { ok: true, id }
}

// Pasa el evento (o solo esa vez de una serie) a otro día, conservando su hora. `occurrence` es el día
// de la vez que se mueve.
export async function moveEventAction(id: string, raw: unknown, occurrence: IsoDate): Promise<EventActionResult> {
  const parsed = moveEventSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const current = findRecord(id, await seedRecords())
  if (!current) return failure('No encontramos ese evento.')

  if (current.repeat === 'none') {
    saveRecord({ ...current, date: parsed.data.date })
  } else {
    // Una vez de una serie que se mueve deja de ser de la serie: se salta ese día y nace un evento suelto.
    saveRecord({ ...current, skip: [...current.skip, occurrence] })
    addRecord({ ...current, id: crypto.randomUUID(), date: parsed.data.date, repeat: 'none', until: null, skip: [] })
  }
  refresh()
  return { ok: true, id }
}

// "Duplicar": un evento suelto igual, el mismo día, con "(copia)" en el título.
export async function duplicateEventAction(id: string, occurrence: IsoDate): Promise<EventActionResult> {
  await mockDelay()
  const current = findRecord(id, await seedRecords())
  if (!current) return failure('No encontramos ese evento.')
  const copy: EventRecord = { ...current, id: crypto.randomUUID(), title: `${current.title} (copia)`.slice(0, 120), date: occurrence, repeat: 'none', until: null, skip: [] }
  addRecord(copy)
  refresh()
  return { ok: true, id: copy.id }
}

// Borra el evento, o solo esa vez, o esa y las siguientes, o toda la serie. Va a la papelera: el token
// que devuelve sirve para deshacerlo.
export async function deleteEventAction(id: string, raw: unknown): Promise<EventActionResult> {
  const parsed = deleteEventSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const current = findRecord(id, await seedRecords())
  if (!current) return failure('No encontramos ese evento.')

  const undoToken = toTrash(current)
  const remaining = deleteFromRecord(current, parsed.data.scope, parsed.data.occurrence)
  if (remaining) saveRecord(remaining)
  else removeRecord(id)
  refresh()
  return { ok: true, id, undoToken }
}

export async function undoDeleteAction(token: string): Promise<EventActionResult> {
  await mockDelay()
  const seeds = await seedRecords()
  if (!restoreFromTrash(token, new Set(seeds.map((seed) => seed.id)))) return failure('Ya no se puede deshacer.')
  refresh()
  return { ok: true }
}
