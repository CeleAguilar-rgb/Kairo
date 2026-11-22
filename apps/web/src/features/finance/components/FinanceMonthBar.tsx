'use client'

import { usePathname, useSearchParams } from 'next/navigation'

import responsive from '@/components/ui/responsive.module.css'
import type { IsoDate } from '@/lib/dates'

import { clampMonth, monthHrefs } from '../finance-utils'
import type { MonthKey } from '../types'

import { MonthSwitcher } from './MonthSwitcher'

// Las partes de Finanzas donde el mes importa; las demás no tienen selector.
const MONTH_TABS = ['/finanzas', '/finanzas/movimientos']

type FinanceMonthBarProps = {
  today: IsoDate
  current: MonthKey
  oldest: MonthKey
}

// El selector de mes en el teléfono: va en el renglón bajo el título (como el subtítulo de las otras pantallas) y
// no en una fila propia bajo las pestañas, así el menú de Finanzas queda en una sola fila. El mes sigue viviendo en
// la dirección (`?mes=…`); aquí se lee con las mismas reglas que usa la página (clampMonth). En escritorio no se
// ve: ahí el selector está en la franja bajo las pestañas (FinanceToolbar).
export function FinanceMonthBar({ today, current, oldest }: FinanceMonthBarProps) {
  const pathname = usePathname()
  const params = useSearchParams()
  if (!MONTH_TABS.includes(pathname)) return null

  const month = clampMonth(params.get('mes') ?? undefined, today)
  const { prevHref, nextHref } = monthHrefs(pathname, month, current, oldest)

  return (
    <div className={responsive.phoneOnly}>
      <MonthSwitcher month={month} prevHref={prevHref} nextHref={nextHref} />
    </div>
  )
}
