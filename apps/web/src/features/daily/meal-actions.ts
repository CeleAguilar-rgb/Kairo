'use server'

import { copyWeekSchema, mealRefSchema, mealSlotSchema, weekSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { addDays, diffDays, startOfWeek } from '@/lib/dates'
import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'

import { failure, type DailyActionResult } from './action-result'
import { mealKey } from './meal-utils'
import { loadWorld, rememberUndo } from './mock-store'
import { weekDates } from './routine-utils'
import type { MealPlan } from './types'

// Las acciones del Menú semanal. Misma idea que routine-actions.ts: se vuelve a validar todo lo que llega,
// y con la API cada una será un `api.post('/meal-plans/…')` con el userId del token.

function refresh() {
  revalidatePath('/dia-a-dia', 'layout')
  revalidatePath('/')
}

// Guarda un platillo. Sin platillo, el espacio se vacía (así lo hace el canvas al guardar con el campo en blanco).
export async function saveMealAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = mealSlotSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world, ctx } = await loadWorld()
  const { date, meal, dish, prep, note } = parsed.data
  const key = mealKey(date, meal)

  if (!dish) {
    world.meals.delete(key)
  } else {
    const current = world.meals.get(key)
    world.meals.set(key, {
      id: current?.id ?? `meal-${date}-${meal}`,
      planDate: date,
      meal,
      dish,
      done: current?.done ?? date < ctx.today,
      prep,
      note: note || null,
      hasEvent: current?.hasEvent ?? false,
    })
  }
  refresh()
  return { ok: true }
}

export async function removeMealAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = mealRefSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadWorld()
  world.meals.delete(mealKey(parsed.data.date, parsed.data.meal))
  refresh()
  return { ok: true }
}

// "Repetir de lunes a viernes": el mismo platillo (y si es meal prep) en la misma comida de la semana.
export async function repeatMealWeekdaysAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = mealSlotSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }
  if (!parsed.data.dish) return { ok: false, errors: { dish: 'Escribe el platillo para repetirlo.' } }

  await mockDelay()
  const { world, ctx } = await loadWorld()
  const { date, meal, dish, prep } = parsed.data
  const monday = startOfWeek(date, 'monday')
  for (let offset = 0; offset < 5; offset += 1) {
    const day = addDays(monday, offset)
    const current = world.meals.get(mealKey(day, meal))
    world.meals.set(mealKey(day, meal), {
      id: current?.id ?? `meal-${day}-${meal}`,
      planDate: day,
      meal,
      dish,
      done: current?.done ?? day < ctx.today,
      prep,
      note: current?.note ?? null,
      hasEvent: current?.hasEvent ?? false,
    })
  }
  refresh()
  return { ok: true }
}

// Marcar una comida de hoy como comida (la tarjeta "Menú de hoy" de Inicio).
export async function toggleMealDoneAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = mealRefSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadWorld()
  const key = mealKey(parsed.data.date, parsed.data.meal)
  const current = world.meals.get(key)
  if (!current) return failure('Esa comida ya no está en el menú.')
  world.meals.set(key, { ...current, done: !current.done })
  refresh()
  return { ok: true }
}

// "Copiar la semana pasada": los platillos y si son meal prep pasan a la semana nueva; las notas no.
export async function copyWeekAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = copyWeekSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadWorld()
  const { from, to } = parsed.data
  const shift = diffDays(from, to)
  const source = weekDates(from).flatMap((day) => (['breakfast', 'lunch', 'dinner'] as const).flatMap((meal) => world.meals.get(mealKey(day, meal)) ?? []))
  if (source.length === 0) return failure('La semana anterior no tiene menú para copiar.')

  for (const plan of source) {
    const day = addDays(plan.planDate, shift)
    world.meals.set(mealKey(day, plan.meal), { ...plan, id: `meal-${day}-${plan.meal}`, planDate: day, done: false, note: null, hasEvent: false })
  }
  refresh()
  return { ok: true }
}

// "Vaciar semana": quita todos los platillos. Van a la papelera, así que se puede deshacer.
export async function clearWeekAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = weekSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadWorld()
  const removed: MealPlan[] = []
  for (const day of weekDates(parsed.data.week)) {
    for (const meal of ['breakfast', 'lunch', 'dinner'] as const) {
      const plan = world.meals.get(mealKey(day, meal))
      if (plan) removed.push(plan)
      world.meals.delete(mealKey(day, meal))
    }
  }
  const undoToken = rememberUndo(world, () => {
    for (const plan of removed) world.meals.set(mealKey(plan.planDate, plan.meal), plan)
  })
  refresh()
  return { ok: true, undoToken }
}
