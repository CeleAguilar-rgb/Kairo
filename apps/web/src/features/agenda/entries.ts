import { cardLabel, type Membership } from '@/features/finance'
import type { Task } from '@/features/tasks'
import { addDays, addMonths, daysInMonth, type IsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

import type { AgendaEntry } from './types'

// De otros módulos, la Agenda solo lee lo que ya publican: los cobros de las membresías (Finanzas) y
// las tareas con fecha (Tareas). Aquí se convierten en entradas de la agenda; la Agenda no toca sus tablas.

// Los cobros de cada membresía dentro de [from, to]: cada semana, cada mes o cada año, en su día de cobro.
// Un cobro el día 31 cae el último día en los meses más cortos.
export function paymentEntries(memberships: Membership[], from: IsoDate, to: IsoDate): AgendaEntry[] {
  const entries: AgendaEntry[] = []
  const push = (membership: Membership, date: IsoDate) => {
    entries.push({
      id: `${membership.id}@${date}`,
      type: 'payment',
      title: `${membership.name} ${formatMoney(membership.amountCents, membership.currency)}`,
      date,
      allDay: true,
      startMin: null,
      endMin: null,
      notes: null,
      place: null,
      project: null,
      detail: cardLabel(membership.card),
      href: '/finanzas/membresias',
    })
  }

  for (const membership of memberships) {
    // Cada semana: de 7 en 7 días a partir del próximo cobro, hacia atrás y hacia adelante.
    if (membership.cadence === 'weekly') {
      let date = membership.nextChargeOn
      while (addDays(date, -7) >= from) date = addDays(date, -7)
      for (; date <= to; date = addDays(date, 7)) if (date >= from) push(membership, date)
      continue
    }

    const step = membership.cadence === 'monthly' ? 1 : 12
    // Se parte del próximo cobro conocido y se cuenta hacia atrás y hacia adelante.
    for (let k = -Math.ceil(24 / step); ; k++) {
      const base = addMonths(membership.nextChargeOn, k * step)
      // El día de cobro manda sobre el día del mes de la base (que pudo ajustarse por un mes corto).
      const last = daysInMonth(base)
      const date = `${base.slice(0, 8)}${String(Math.min(membership.chargeDay, last)).padStart(2, '0')}`
      if (date > to) break
      if (date < from) continue
      push(membership, date)
    }
  }
  return entries
}

// Las tareas pendientes con fecha límite dentro de [from, to].
export function taskEntries(tasks: Task[], from: IsoDate, to: IsoDate): AgendaEntry[] {
  return tasks
    .filter((task) => task.status !== 'done' && task.dueOn && task.dueOn >= from && task.dueOn <= to)
    .map((task) => ({
      id: `task:${task.id}`,
      type: 'task' as const,
      title: task.title,
      date: task.dueOn as IsoDate,
      allDay: true,
      startMin: null,
      endMin: null,
      notes: task.notes,
      place: null,
      project: task.project,
      detail: task.project ? `Tarea del proyecto ${task.project.name}` : 'Tarea sin proyecto',
      href: '/tareas',
    }))
}
