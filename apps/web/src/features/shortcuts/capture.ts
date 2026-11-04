import { addDays, minutesNowIn, todayIn } from '@/lib/dates'

import type { CaptureKind, CaptureWhen } from './types'

// "Tacos 250", "Uber 89.50", "Súper 1,180": el ÚLTIMO número es el monto (en pesos) y lo demás es el concepto. Así
// "Regalo para 2 amigas 300" queda como "Regalo para 2 amigas" por $300. null si no hay número o no hay concepto.
export function parseExpense(text: string): { concept: string; amountCents: number } | null {
  const match = /^(.*?)\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*$/.exec(text.trim())
  if (!match) return null
  const concept = match[1].trim()
  const pesos = Number(match[2].replaceAll(',', ''))
  const cents = Number((match[3] ?? '0').padEnd(2, '0'))
  const amountCents = pesos * 100 + cents
  if (!concept || amountCents <= 0) return null
  return { concept, amountCents }
}

// Las fechas que ofrece cada tipo (Atajos.dc.html, `whens`). Un evento y un recordatorio necesitan día; un gasto
// "en otra fecha" se captura en el formulario completo; una nota no tiene fecha.
export const WHENS: Record<CaptureKind, CaptureWhen[]> = {
  task: ['today', 'tomorrow', 'none'],
  event: ['today', 'tomorrow'],
  expense: ['today', 'none'],
  reminder: ['today', 'tomorrow'],
  note: [],
}

export function whenLabel(kind: CaptureKind, when: CaptureWhen): string {
  if (when === 'today') return 'Hoy'
  if (when === 'tomorrow') return 'Mañana'
  return kind === 'expense' ? 'Otra fecha' : 'Sin fecha'
}

// El día que corresponde a "Hoy" o "Mañana" en la zona del perfil (null = sin fecha).
export function dayFor(when: CaptureWhen, timeZone: string): string | null {
  const today = todayIn(timeZone)
  if (when === 'today') return today
  if (when === 'tomorrow') return addDays(today, 1)
  return null
}

// La hora de un recordatorio capturado rápido: hoy, la siguiente hora en punto (si ya no queda hora hoy, mañana a
// las 9); mañana, a las 9. Se ajusta después en Recordatorios.
export function reminderSlot(when: CaptureWhen, timeZone: string): { date: string; time: string } {
  const today = todayIn(timeZone)
  if (when === 'today') {
    const nextHour = Math.floor(minutesNowIn(timeZone) / 60) + 1
    if (nextHour <= 23) return { date: today, time: `${String(nextHour).padStart(2, '0')}:00` }
  }
  return { date: addDays(today, 1), time: '09:00' }
}
