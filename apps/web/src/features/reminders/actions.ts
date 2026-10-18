'use server'

import { createReminderSchema, snoozeReminderSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { zonedToUtc } from '@/lib/dates'
import { fieldErrors } from '@/lib/form-errors'
import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildReminders } from './mock'
import { addReminder, findReminder, remember, restore, saveReminder } from './mock-store'
import { isInPast, nextOccurrence, snoozeTarget } from './reminder-utils'
import type { Reminder } from './types'

// Las acciones de Recordatorios. Una Server Action es un endpoint público: lo que llega NO se confía, se
// vuelve a validar con el mismo esquema del front (packages/shared). Con la API, en vez de las
// funciones de mock-store llaman a `api.post('/reminders', parsed.data)` y compañía; el userId lo pone la
// API con el token (regla 2) y toda consulta filtra por él (regla 3). El `id` no se valida aquí porque
// en los datos de ejemplo no es un uuid; en la API será un `z.uuid()` y la consulta con `where: { id, userId }`.
export type ReminderActionResult =
  | { ok: true; id?: string; undoToken?: string }
  // `errors` va por campo ("title", "time"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

const failure = (message: string): ReminderActionResult => ({ ok: false, errors: {}, message })

// Los recordatorios de ejemplo de hoy: de ahí se parte para saber qué existe.
async function seedReminders() {
  return buildReminders(await getMockContext())
}

function refresh() {
  revalidatePath('/recordatorios')
  // La tarjeta "Recordatorios" de Inicio lee de la misma lista.
  revalidatePath('/')
}

export async function createReminderAction(raw: unknown): Promise<ReminderActionResult> {
  const parsed = createReminderSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { timeZone } = await getMockContext()
  const { title, date, time, repeat } = parsed.data
  // Un recordatorio que ya nace atrasado no sirve: nunca avisaría.
  if (isInPast(date, time, new Date().toISOString(), timeZone)) {
    return { ok: false, errors: { time: 'Esa hora ya pasó. Elige una más adelante.' } }
  }

  const reminder: Reminder = {
    id: crypto.randomUUID(),
    title,
    remindAt: zonedToUtc(date, time, timeZone),
    precision: 'time',
    doneAt: null,
    snoozedTo: null,
    source: { kind: 'manual', label: '' },
    repeat,
  }
  addReminder(reminder)
  refresh()
  return { ok: true, id: reminder.id }
}

// Marca como listo. Si se repite ("Cada día", "Lunes a viernes") nace la siguiente vez; el token que
// devuelve deshace las dos cosas.
export async function completeReminderAction(id: string): Promise<ReminderActionResult> {
  await mockDelay()
  const { today, timeZone } = await getMockContext()
  const current = findReminder(id, await seedReminders())
  if (!current || current.doneAt) return failure('No encontramos ese recordatorio.')

  const nextAt = nextOccurrence(current, today, timeZone)
  const next: Reminder | null = nextAt ? { ...current, id: crypto.randomUUID(), remindAt: nextAt, snoozedTo: null } : null
  const undoToken = remember({ previous: current, createdId: next?.id })

  saveReminder({ ...current, doneAt: new Date().toISOString() })
  if (next) addReminder(next)
  refresh()
  return { ok: true, id, undoToken }
}

// Pospone: vuelve a avisar en 10 minutos, en 1 hora o mañana a las 9.
export async function snoozeReminderAction(id: string, raw: unknown): Promise<ReminderActionResult> {
  const parsed = snoozeReminderSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { timeZone } = await getMockContext()
  const current = findReminder(id, await seedReminders())
  if (!current || current.doneAt) return failure('No encontramos ese recordatorio.')

  const undoToken = remember({ previous: current })
  saveReminder({ ...current, snoozedTo: snoozeTarget(parsed.data.until, new Date().toISOString(), timeZone) })
  refresh()
  return { ok: true, id, undoToken }
}

// "Deshacer" de marcar como listo o de posponer.
export async function undoReminderAction(token: string): Promise<ReminderActionResult> {
  await mockDelay()
  if (!restore(token)) return failure('Ya no se puede deshacer.')
  refresh()
  return { ok: true }
}
