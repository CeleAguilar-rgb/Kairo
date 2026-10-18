import 'server-only'

import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildReminders } from './mock'
import { applyStore } from './mock-store'
import { effectiveAt } from './reminder-utils'
import type { Reminder } from './types'

// Los recordatorios pendientes (sin marcar como listos), el que toca primero arriba. Los de hoy,
// los atrasados y los que vienen: la pantalla y la tarjeta de Inicio los separan y recortan como
// les toca. Con la API: `api.get('/reminders')`, filtrando `done_at IS NULL AND deleted_at IS NULL`.
export async function listUpcomingReminders(): Promise<Reminder[]> {
  const ctx = await getMockContext()
  await mockDelay()
  return applyStore(buildReminders(ctx))
    .filter((reminder) => reminder.doneAt === null)
    .sort((a, b) => effectiveAt(a).localeCompare(effectiveAt(b)))
}
