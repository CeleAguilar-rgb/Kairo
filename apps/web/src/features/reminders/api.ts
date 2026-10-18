import 'server-only'

import { api } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildReminders } from './mock'
import type { Reminder } from './types'

// Los recordatorios pendientes (sin marcar como listos), el que toca primero arriba. Con la API:
// filtrado por `done_at IS NULL AND deleted_at IS NULL`, ordenado por servidor.
// Modo demo (lib/demo.ts): no hay Supabase ni API, sigue con datos de ejemplo.
export async function listUpcomingReminders(): Promise<Reminder[]> {
  if (DEMO_MODE) {
    const ctx = await getMockContext()
    await mockDelay()
    return buildReminders(ctx)
  }
  return api.get<Reminder[]>('/reminders')
}
