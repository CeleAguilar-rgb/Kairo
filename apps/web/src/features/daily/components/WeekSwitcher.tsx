import Link from 'next/link'

import { LineIcon } from '@/components/ui/Card'
import type { IsoDate } from '@/lib/dates'

import { weekLabel } from '../meal-utils'

import styles from './WeekSwitcher.module.css'

type WeekSwitcherProps = {
  // El primer día de la semana que se muestra (se escribe como "5 – 11 oct").
  weekStart: IsoDate
  // null = ya no se puede ir más lejos en esa dirección.
  prevHref: string | null
  nextHref: string | null
}

// Las flechas de semana del Menú y del Reporte. Son enlaces (`?semana=…`), no estado: la semana vive en la
// dirección, así que se puede compartir, el botón "atrás" funciona y la página se arma en el servidor.
export function WeekSwitcher({ weekStart, prevHref, nextHref }: WeekSwitcherProps) {
  return (
    <div className={styles.switcher}>
      <Arrow href={prevHref} label="Semana anterior" d="M15 6l-6 6 6 6" />
      <span className={styles.label} aria-live="polite">
        {weekLabel(weekStart)}
      </span>
      <Arrow href={nextHref} label="Semana siguiente" d="M9 6l6 6-6 6" />
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
