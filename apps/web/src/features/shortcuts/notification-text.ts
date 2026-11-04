import type { NotificationSource } from '@kairo/shared'

import { addDays, dateOfMoment, formatDayMonth, formatTime, todayIn } from '@/lib/dates'

import type { HitTone } from './search-text'
import type { NotificationItem } from './types'

// De dónde salió el aviso, como lo nombra Atajos.dc.html en la línea de abajo ("Presupuesto · 14:10").
const SOURCE_LABEL: Record<NotificationSource, string> = {
  reminder: 'Recordatorio',
  membership: 'Membresía',
  budget: 'Presupuesto',
  debt: 'Deuda',
  system: 'Kairo',
}

// El ícono de cada origen (los trazos de IC en Atajos.dc.html: la campana para lo que avisa, la tarjeta para el dinero).
const BELL = 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9'
const MONEY = 'M4 7h16v10H4zM4 11h16'
export const SOURCE_ICON: Record<NotificationSource, { d: string; tone: HitTone }> = {
  reminder: { d: BELL, tone: 'accent' },
  membership: { d: MONEY, tone: 'warm' },
  budget: { d: MONEY, tone: 'warm' },
  debt: { d: MONEY, tone: 'warm' },
  system: { d: BELL, tone: 'accent' },
}

export type NotificationGroup = { name: string; items: NotificationItem[] }

// "Hoy", "Ayer" y "Antes", en la zona del perfil. Los grupos vacíos no salen. La API ya los manda del más nuevo al
// más viejo.
export function groupNotifications(items: NotificationItem[], timeZone: string, now = new Date()): NotificationGroup[] {
  const today = todayIn(timeZone, now)
  const yesterday = addDays(today, -1)
  const groups: NotificationGroup[] = [
    { name: 'Hoy', items: [] },
    { name: 'Ayer', items: [] },
    { name: 'Antes', items: [] },
  ]
  for (const item of items) {
    const day = dateOfMoment(item.createdAt, timeZone)
    groups[day === today ? 0 : day === yesterday ? 1 : 2]!.items.push(item)
  }
  return groups.filter((group) => group.items.length > 0)
}

// "Presupuesto · 14:10" hoy y ayer; "Membresía · 28 oct" en "Antes", donde la hora sola no dice cuándo.
export function notificationSub(item: NotificationItem, timeZone: string, now = new Date()): string {
  const day = dateOfMoment(item.createdAt, timeZone)
  const when = day >= addDays(todayIn(timeZone, now), -1) ? formatTime(item.createdAt, timeZone) : formatDayMonth(day)
  return `${SOURCE_LABEL[item.sourceType]} · ${when}`
}
