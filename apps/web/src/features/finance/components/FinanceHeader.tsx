import { Suspense } from 'react'

import { PageHeading } from '@/components/layout/PageHeading'
import type { IsoDate } from '@/lib/dates'

import type { MonthKey } from '../types'

import { FinanceMonthBar } from './FinanceMonthBar'
import { FinanceTabs } from './FinanceTabs'
import styles from './FinanceHeader.module.css'

type FinanceHeaderProps = {
  today: IsoDate
  current: MonthKey
  oldest: MonthKey
}

// La cabecera común de las cinco partes de Finanzas: el título a mano con su garabato y las pestañas. Vive en el
// layout, así que al cambiar de pestaña no se vuelve a animar (igual que la de Día a día y la de un proyecto).
// En el teléfono el selector de mes va bajo el título (FinanceMonthBar).
export function FinanceHeader({ today, current, oldest }: FinanceHeaderProps) {
  return (
    <header className={styles.hero}>
      <PageHeading title="Finanzas" squiggleWidth={200}>
        <Suspense fallback={null}>
          <FinanceMonthBar today={today} current={current} oldest={oldest} />
        </Suspense>
      </PageHeading>
      <FinanceTabs />
    </header>
  )
}
