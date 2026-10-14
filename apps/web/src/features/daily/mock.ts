import 'server-only'

import { minutesNowIn } from '@/lib/dates'
import type { MockContext } from '@/lib/mock/context'

import type { Goal, MealPlan, RoutineBlockToday, RoutineKind } from './types'

type BlockSeed = { id: string; start: string; end: string; title: string; kind: RoutineKind; note?: string }

// Un día de rutina con los bloques que aparecen en Main.dc.html y DiaADia.dc.html.
const BLOCKS: BlockSeed[] = [
  { id: 'rb1', start: '07:00', end: '07:30', title: 'Despertar y estirar', kind: 'habit' },
  { id: 'rb2', start: '08:00', end: '08:30', title: 'Desayunar', kind: 'meal', note: 'Avena con plátano' },
  { id: 'rb3', start: '09:00', end: '13:00', title: 'Trabajo', kind: 'work' },
  { id: 'rb4', start: '14:00', end: '15:00', title: 'Comer', kind: 'meal', note: 'Tinga con arroz' },
  { id: 'rb5', start: '16:00', end: '16:15', title: 'Tomar agua', kind: 'habit' },
  { id: 'rb6', start: '17:00', end: '18:30', title: 'Avanzar escuela', kind: 'focus', note: 'Revisar requisitos de inscripción' },
  { id: 'rb7', start: '19:00', end: '20:00', title: 'Proyecto personal', kind: 'focus' },
  { id: 'rb8', start: '20:30', end: '21:15', title: 'Cenar', kind: 'meal', note: 'Quesadillas con frijoles' },
  { id: 'rb9', start: '22:30', end: '23:00', title: 'Leer antes de dormir', kind: 'rest' },
]

// Para que siempre haya un ejemplo de "no marcado" (en rojo en el canvas),
// "Tomar agua" nunca está hecho; lo demás que ya pasó, sí.
const NEVER_DONE = new Set(['rb5'])

export function buildRoutineToday(ctx: MockContext): RoutineBlockToday[] {
  const now = minutesNowIn(ctx.timeZone)
  return BLOCKS.map((block, position) => ({
    id: block.id,
    startsAt: block.start,
    endsAt: block.end,
    title: block.title,
    kind: block.kind,
    position,
    done: toMinutes(block.end) <= now && !NEVER_DONE.has(block.id),
    note: block.note ?? null,
  }))
}

export function buildMealsToday(ctx: MockContext): MealPlan[] {
  const now = minutesNowIn(ctx.timeZone)
  return [
    { id: 'm1', planDate: ctx.today, meal: 'breakfast', dish: 'Avena con plátano', done: now > toMinutes('08:30') },
    { id: 'm2', planDate: ctx.today, meal: 'lunch', dish: 'Tinga con arroz', done: now > toMinutes('15:00') },
    { id: 'm3', planDate: ctx.today, meal: 'dinner', dish: 'Quesadillas con frijoles', done: now > toMinutes('21:15') },
  ]
}

export function buildGoals(ctx: MockContext): Goal[] {
  return [
    { id: 'g1', title: 'Entrar a la ingeniería', target: 10, current: 2, unit: 'pasos', dueOn: ctx.day(200) },
    { id: 'g2', title: 'Terminar el dashboard', target: 100, current: 62, unit: '%', dueOn: ctx.day(60) },
    { id: 'g3', title: 'Vitaminas el 90% de los días', target: 90, current: 88, unit: 'días', dueOn: null },
  ]
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
