import type { IsoDate } from '@/lib/dates'

// Tablas routine_blocks + routine_logs, meal_plans y goals de
// docs/guides/data-model.md (camelCase).

export type RoutineKind = 'focus' | 'habit' | 'meal' | 'work' | 'rest'

export const ROUTINE_KIND_LABEL: Record<RoutineKind, string> = {
  focus: 'Enfoque',
  habit: 'Hábito',
  meal: 'Comida',
  work: 'Trabajo',
  rest: 'Descanso',
}

// Un bloque de la rutina de hoy junto con su registro del día (routine_logs).
export type RoutineBlockToday = {
  id: string
  // Horas de pared ('HH:MM', columna time): la rutina no depende de la zona.
  startsAt: string
  endsAt: string
  title: string
  kind: RoutineKind
  position: number
  done: boolean
  note: string | null
}

export type Meal = 'breakfast' | 'lunch' | 'dinner'

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
}

export type MealPlan = {
  id: string
  planDate: IsoDate
  meal: Meal
  dish: string
  done: boolean
}

export type Goal = {
  id: string
  title: string
  target: number
  current: number
  unit: string
  dueOn: IsoDate | null
}
