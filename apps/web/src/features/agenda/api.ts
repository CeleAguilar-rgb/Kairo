import 'server-only'

import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildWeekEvents } from './mock'
import type { AgendaEvent } from './types'

// Con la API: `api.get<AgendaEvent[]>('/agenda?from=…&to=…')`.
export async function listWeekEvents(): Promise<AgendaEvent[]> {
  const ctx = await getMockContext()
  await mockDelay()
  return buildWeekEvents(ctx)
}
