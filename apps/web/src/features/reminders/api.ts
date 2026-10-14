import 'server-only'

import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildReminders } from './mock'
import type { Reminder } from './types'

export async function listUpcomingReminders(): Promise<Reminder[]> {
  const ctx = await getMockContext()
  await mockDelay()
  return buildReminders(ctx).sort((a, b) => a.remindAt.localeCompare(b.remindAt))
}
