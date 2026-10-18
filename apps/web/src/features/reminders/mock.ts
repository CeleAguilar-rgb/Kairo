import 'server-only'

import { minutesNowIn, minutesToWallTime } from '@/lib/dates'
import type { MockContext } from '@/lib/mock/context'

import type { Reminder } from './types'

// Recordatorios de Recordatorios.dc.html (los de hoy) y de Main.dc.html (los que vienen). Los de hoy se
// arman a partir de la hora de ahora, redondeada a 5 minutos, para que la pantalla siempre se vea como
// el canvas —uno atrasado, los demás por venir— sin importar a qué hora la abras.
export function buildReminders(ctx: MockContext): Reminder[] {
  const nowMinutes = minutesNowIn(ctx.timeZone)
  // Un momento "ahora + N minutos" (N puede ser negativo). Si cruza la medianoche cae en otro día.
  const inMinutes = (delta: number) => {
    const total = Math.round((nowMinutes + delta) / 5) * 5
    return ctx.at(Math.floor(total / 1440), minutesToWallTime(((total % 1440) + 1440) % 1440))
  }

  const base = { doneAt: null, snoozedTo: null, repeat: 'none' } as const

  return [
    { ...base, id: 'r4', title: 'No has tomado tus vitaminas', remindAt: inMinutes(-40), precision: 'time', source: { kind: 'routine', label: 'Rutina de mañana' } },
    { ...base, id: 'r5', title: 'Daily en 10 minutos', remindAt: inMinutes(40), precision: 'time', source: { kind: 'event', label: 'Daily' } },
    { ...base, id: 'r6', title: 'Tomar agua', remindAt: inMinutes(80), precision: 'time', source: { kind: 'routine', label: 'Rutina' } },
    { ...base, id: 'r7', title: 'Mañana se cobra Spotify $129', remindAt: ctx.at(0, '09:00'), precision: 'day', source: { kind: 'membership', label: '••4417' } },
    { ...base, id: 'r8', title: 'Llamar a la universidad', remindAt: inMinutes(140), precision: 'time', source: { kind: 'task', label: 'Ingeniería o maestría' } },
    { ...base, id: 'r9', title: 'Hora de comer', remindAt: inMinutes(260), precision: 'time', source: { kind: 'routine', label: 'Rutina' } },
    { ...base, id: 'r1', title: 'Cita con el dentista', remindAt: ctx.at(2, '17:00'), precision: 'time', source: { kind: 'manual', label: '' } },
    { ...base, id: 'r2', title: 'Renovar el dominio', remindAt: ctx.at(6, '09:00'), precision: 'day', source: { kind: 'manual', label: '' } },
    { ...base, id: 'r3', title: 'Revisar inscripción a la ingeniería o maestría', remindAt: ctx.at(30, '09:00'), precision: 'month', source: { kind: 'manual', label: '' } },
  ]
}
