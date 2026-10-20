import type { Weekday } from '@kairo/shared'

// Lógica pura mínima de fechas que ya existe en apps/web/src/lib/dates.ts: se duplica aquí, mínima (mismo motivo
// que sprints-utils.ts: la API no importa código de apps/web ni los archivos internos de otro módulo).

export type IsoDate = string

export function todayIn(timeZone: string, now = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

function addDays(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10)
}

// getUTCDay(): domingo = 0. Escuela solo tiene lunes a sábado (WEEKDAYS de @kairo/shared).
const WEEKDAY_NUMBER: Record<Weekday, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

// El primer día `weekday` que cae en `from` o después: ahí empieza la serie semanal de esa clase en Agenda.
export function firstOnOrAfter(from: IsoDate, weekday: Weekday): IsoDate {
  const [year, month, day] = from.split('-').map(Number)
  const current = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()
  return addDays(from, (WEEKDAY_NUMBER[weekday] - current + 7) % 7)
}

// Una calificación se guarda con un decimal (numeric(3,1)); la base la devuelve como texto ("8.5").
export const gradeToColumn = (value: number | null): string | null => (value === null ? null : (Math.round(value * 10) / 10).toFixed(1))
export const gradeFromColumn = (value: string | null): number | null => (value === null ? null : Number(value))
