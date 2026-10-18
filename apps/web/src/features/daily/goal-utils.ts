import { formatDayMonth, WEEKDAYS_SHORT, weekdayOf, type IsoDate } from '@/lib/dates'

import type { Goal, GoalLogEntry } from './types'

// Lógica pura de Metas (sin React ni servidor).

// "Vitaminas el 90% de los días": en una meta de hábito, la meta es esta proporción de días.
export const HABIT_TARGET_PERCENT = 90

// 0 a 1. Una meta que se pasó de la cantidad queda llena, no desborda la barra.
export function goalRatio(goal: Pick<Goal, 'current' | 'target'>): number {
  if (goal.target <= 0) return 0
  return Math.min(1, Math.max(0, goal.current / goal.target))
}

export function goalPercent(goal: Pick<Goal, 'current' | 'target'>): number {
  return Math.round(goalRatio(goal) * 100)
}

// 18400 → "18,400" ; con "$" va delante: "$6,200".
export function formatGoalAmount(value: number, unit: string): string {
  const text = value.toLocaleString('es-MX')
  return unit === '$' ? `$${text}` : text
}

// El texto bajo el porcentaje: "1 de 5 hitos", "Proyecto al 62%", "88% este mes · meta 90%", "18,400 de 50,000".
export function goalProgressText(goal: Goal): string {
  switch (goal.kind) {
    case 'milestones':
      return `${goal.current} de ${goal.target} ${goal.target === 1 ? 'hito' : 'hitos'}`
    case 'project':
      return `Proyecto al ${goal.current}%`
    case 'habit':
      return `${goal.current}% este mes · meta ${goal.target}%`
    case 'number': {
      const unit = goal.unit && goal.unit !== '$' ? ` ${goal.unit}` : ''
      return `${formatGoalAmount(goal.current, goal.unit)} de ${formatGoalAmount(goal.target, goal.unit)}${unit}`
    }
  }
}

// "29 de octubre", "31 de enero de 2027", "Cada mes" (un hábito no tiene fecha) o "Sin fecha".
export function goalDueText(goal: Pick<Goal, 'kind' | 'dueOn'>, today: IsoDate): string {
  if (!goal.dueOn) return goal.kind === 'habit' ? 'Cada mes' : 'Sin fecha'
  const sameYear = goal.dueOn.slice(0, 4) === today.slice(0, 4)
  return sameYear ? formatDayMonth(goal.dueOn) : `${formatDayMonth(goal.dueOn)} de ${goal.dueOn.slice(0, 4)}`
}

export function goalAchievedText(goal: Pick<Goal, 'achievedOn'>): string {
  return goal.achievedOn ? `Lograda el ${formatDayMonth(goal.achievedOn)}` : 'Lograda'
}

// "12 libros" → { target: 12, unit: 'libros' } ; "$10,000" → { target: 10000, unit: '$' } ; "50,000" → sin unidad.
export function parseGoalTarget(text: string): { target: number | null; unit: string } {
  const match = text.trim().match(/^(\$)?\s*(\d[\d.,]*)\s*(.*)$/)
  if (!match) return { target: null, unit: '' }
  const [, dollar, digits, rest] = match
  const target = Number(digits.replaceAll(',', ''))
  if (!Number.isFinite(target)) return { target: null, unit: '' }
  return { target, unit: dollar ? '$' : rest.trim() }
}

// "Domingo 4 oct" en el historial de avance.
export function formatLogDate(entry: Pick<GoalLogEntry, 'date'>): string {
  const day = entry.date.slice(8, 10).replace(/^0/, '')
  const month = formatDayMonth(entry.date).split(' de ')[1]?.slice(0, 3) ?? ''
  return `${WEEKDAYS_SHORT[weekdayOf(entry.date)]} ${day} ${month}`
}

export function formatLogAmount(amount: number, unit: string): string {
  return `+${formatGoalAmount(amount, unit)}`
}
