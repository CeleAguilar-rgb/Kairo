import { addDays, dayOfMonth, formatMonthShort, wallTimeToMinutes, type IsoDate } from '@/lib/dates'

import { mondayIndex } from './routine-utils'
import type { Meal, MealPlan, RoutineBlock } from './types'

// Lógica pura del menú semanal (sin React ni servidor).

export const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner']

// A qué hora y con qué bloque de la rutina se come cada comida si la rutina no trae comidas propias.
const DEFAULT_MEAL_SLOTS: Record<Meal, { time: string; blockTitle: string }> = {
  breakfast: { time: '07:30', blockTitle: 'Desayunar' },
  lunch: { time: '14:00', blockTitle: 'Comer' },
  dinner: { time: '20:30', blockTitle: 'Cenar' },
}

// La hora y el bloque de cada comida: salen de los bloques de clase "Comida" de la rutina, del más temprano
// al más tarde (desayuno, comida, cena). Con menos de tres, se usan las horas de siempre.
export function mealSlots(blocks: Pick<RoutineBlock, 'kind' | 'startsAt' | 'title'>[]): Record<Meal, { time: string; blockTitle: string }> {
  const meals = blocks.filter((block) => block.kind === 'meal').sort((a, b) => wallTimeToMinutes(a.startsAt) - wallTimeToMinutes(b.startsAt))
  if (meals.length < 3) return DEFAULT_MEAL_SLOTS
  const pick = (block: Pick<RoutineBlock, 'startsAt' | 'title'>) => ({ time: block.startsAt, blockTitle: block.title })
  return { breakfast: pick(meals[0]), lunch: pick(meals[Math.floor(meals.length / 2)]), dinner: pick(meals[meals.length - 1]) }
}

export function mealKey(date: IsoDate, meal: Meal): string {
  return `${date}|${meal}`
}

// "5 – 11 oct" o, si cruza de mes, "28 sep – 4 oct".
export function weekLabel(weekStart: IsoDate): string {
  const weekEnd = addDays(weekStart, 6)
  if (weekStart.slice(0, 7) === weekEnd.slice(0, 7)) return `${dayOfMonth(weekStart)} – ${dayOfMonth(weekEnd)} ${formatMonthShort(weekEnd)}`
  return `${dayOfMonth(weekStart)} ${formatMonthShort(weekStart)} – ${dayOfMonth(weekEnd)} ${formatMonthShort(weekEnd)}`
}

// "13 de 21 comidas planeadas · comida de lunes a viernes es meal prep"
export function mealWeekSummary(plans: MealPlan[]): string {
  const filled = plans.filter((plan) => plan.dish).length
  const base = `${filled} de 21 comidas planeadas`
  const prep = plans.filter((plan) => plan.dish && plan.prep)
  if (prep.length === 0) return base
  const weekdayLunches = plans.filter((plan) => plan.meal === 'lunch' && plan.dish && mondayIndex(plan.planDate) < 5)
  if (weekdayLunches.length === 5 && weekdayLunches.every((plan) => plan.prep) && prep.length === 5) {
    return `${base} · comida de lunes a viernes es meal prep`
  }
  return `${base} · ${prep.length} de meal prep`
}

// Cuántos platillos hay en una semana (para "¿Vaciar los N platillos?").
export function filledCount(plans: MealPlan[]): number {
  return plans.filter((plan) => plan.dish).length
}
