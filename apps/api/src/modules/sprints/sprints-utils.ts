// Lógica pura mínima de fechas que ya existe en apps/web/src/lib/dates.ts: se duplica aquí, mínima (mismo motivo
// que daily-utils.ts y finance-utils.ts: la API no importa código de apps/web).

export type IsoDate = string

export function todayIn(timeZone: string, now = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10)
}

// ¿Es un error de "ya existe" de Postgres (índice único)? Drizzle envuelve el error original en `cause`.
export function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } } | null)
  return code?.code === '23505' || code?.cause?.code === '23505'
}
