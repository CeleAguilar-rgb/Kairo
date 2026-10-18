'use server'

import { journalEntrySchema, isoDateSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'

import { failure, type DailyActionResult } from './action-result'
import { getDaySummary } from './api'
import { loadWorld, rememberUndo } from './mock-store'
import type { JournalEntry, MoodLevel } from './types'

// Las acciones del Diario. Con la API, el cuerpo de la entrada viaja cifrado (AES-256-GCM, security.md) y
// solo se lee con el permiso corto que da el PIN; aquí no existe ninguna de las dos cosas todavía.

function refresh() {
  revalidatePath('/dia-a-dia', 'layout')
}

// Guarda (o actualiza) la entrada de hoy. Una por día: si ya existe, se reemplaza.
export async function saveJournalAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = journalEntrySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world, ctx } = await loadWorld()
  const { date, mood, body, gratitude, tags } = parsed.data
  if (date !== ctx.today) return failure('Solo puedes escribir la entrada de hoy.')

  const entry: JournalEntry = {
    id: `entry-${date}`,
    entryDate: date,
    mood: mood as MoodLevel,
    body,
    gratitude: gratitude.filter(Boolean),
    tags,
    summary: await getDaySummary(),
    savedAt: new Date().toISOString(),
  }
  const index = world.journal.findIndex((item) => item.entryDate === date)
  if (index >= 0) world.journal[index] = entry
  else world.journal.push(entry)
  refresh()
  return { ok: true, id: entry.id }
}

// Borra la entrada de un día. Va a la papelera: el aviso trae "Deshacer".
export async function deleteJournalAction(date: string): Promise<DailyActionResult> {
  if (!isoDateSchema.safeParse(date).success) return failure('No encontramos esa entrada.')

  await mockDelay()
  const { world } = await loadWorld()
  const index = world.journal.findIndex((entry) => entry.entryDate === date)
  if (index < 0) return failure('No encontramos esa entrada.')

  const [removed] = world.journal.splice(index, 1)
  const undoToken = rememberUndo(world, () => world.journal.push(removed))
  refresh()
  return { ok: true, id: removed.id, undoToken }
}
