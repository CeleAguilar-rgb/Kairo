import Link from 'next/link'

import { LineIcon } from '@/components/ui/Card'

import { monthTitle } from '../finance-utils'
import type { MonthKey } from '../types'

import styles from './MonthSwitcher.module.css'

type MonthSwitcherProps = {
  month: MonthKey
  // null = ya no se puede ir más lejos en esa dirección.
  prevHref: string | null
  nextHref: string | null
}

// Las flechas de mes del Resumen y de Movimientos. Son enlaces (`?mes=…`), no estado: el mes vive en la
// dirección, así que se puede compartir, el botón "atrás" funciona y la página se arma en el servidor.
export function MonthSwitcher({ month, prevHref, nextHref }: MonthSwitcherProps) {
  return (
    <div className={styles.switcher}>
      <Arrow href={prevHref} label="Mes anterior" d="M15 6l-6 6 6 6" />
      <span className={styles.label} aria-live="polite">
        {monthTitle(month)}
      </span>
      <Arrow href={nextHref} label="Mes siguiente" d="M9 6l6 6-6 6" />
    </div>
  )
}

function Arrow({ href, label, d }: { href: string | null; label: string; d: string }) {
  const icon = <LineIcon d={d} size={16} strokeWidth={2} />
  if (!href) {
    return (
      <button type="button" className={styles.arrow} aria-label={label} disabled>
        {icon}
      </button>
    )
  }
  return (
    <Link href={href} className={styles.arrow} aria-label={label} scroll={false}>
      {icon}
    </Link>
  )
}
