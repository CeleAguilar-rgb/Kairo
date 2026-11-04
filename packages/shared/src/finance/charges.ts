import type { MembershipCadence } from './constants'

// El día de cobro de una membresía, compartido por el front (la lista de Membresías, Inicio, Agenda) y la API (la
// tarea programada que anota sola el cobro, decisión #40). Fechas como texto AAAA-MM-DD: son días sueltos (regla 8),
// así que se calculan en UTC sin que ninguna zona horaria las mueva.
export type ChargeRule = {
  cadence: MembershipCadence
  chargeDay: number | null
  chargeMonth: number | null
  // 0 = domingo … 6 = sábado.
  chargeWeekday: number | null
}

const toUtc = (day: string) => new Date(`${day}T00:00:00Z`)
const fromUtc = (date: Date) => date.toISOString().slice(0, 10)

function addDays(day: string, days: number) {
  const date = toUtc(day)
  date.setUTCDate(date.getUTCDate() + days)
  return fromUtc(date)
}

// El día `day` de ese mes, o el último si el mes es más corto (un cobro el 31 cae el 30 o el 28).
function dateIn(year: number, month: number, day: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}

// El próximo cobro a partir de `today` (hoy cuenta). No se guarda: se calcula con el día de cobro, así nunca
// queda en el pasado.
export function nextChargeOn(rule: ChargeRule, today: string): string {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))

  if (rule.cadence === 'weekly') {
    const weekday = rule.chargeWeekday ?? 0
    return addDays(today, (weekday - toUtc(today).getUTCDay() + 7) % 7)
  }

  const day = rule.chargeDay ?? 1
  if (rule.cadence === 'yearly') {
    const thisYear = dateIn(year, rule.chargeMonth ?? 1, day)
    return thisYear >= today ? thisYear : dateIn(year + 1, rule.chargeMonth ?? 1, day)
  }

  const thisMonth = dateIn(year, month, day)
  if (thisMonth >= today) return thisMonth
  return month === 12 ? dateIn(year + 1, 1, day) : dateIn(year, month + 1, day)
}

// ¿Se cobra justo ese día?
export const chargesOn = (rule: ChargeRule, day: string) => nextChargeOn(rule, day) === day
