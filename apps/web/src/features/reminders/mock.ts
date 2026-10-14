import 'server-only'

import type { MockContext } from '@/lib/mock/context'

import type { Reminder } from './types'

// Recordatorios de Main.dc.html.
export function buildReminders(ctx: MockContext): Reminder[] {
  return [
    { id: 'r1', title: 'Cita con el dentista', remindAt: ctx.at(2, '17:00'), precision: 'time', doneAt: null, snoozedTo: null },
    { id: 'r2', title: 'Renovar el dominio', remindAt: ctx.at(6, '09:00'), precision: 'day', doneAt: null, snoozedTo: null },
    { id: 'r3', title: 'Revisar inscripción a la ingeniería o maestría', remindAt: ctx.at(30, '09:00'), precision: 'month', doneAt: null, snoozedTo: null },
  ]
}
