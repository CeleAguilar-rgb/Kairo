'use client'

import { LayoutGroup, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { usePendingHref } from '@/components/layout/Navigation'
import { SPRING } from '@/lib/motion'

import styles from './DailyTabs.module.css'

const BASE = '/dia-a-dia'

const TABS = [
  { href: BASE, label: 'Hoy' },
  { href: `${BASE}/menu`, label: 'Menú' },
  { href: `${BASE}/reporte`, label: 'Reporte' },
  { href: `${BASE}/diario`, label: 'Diario' },
  { href: `${BASE}/metas`, label: 'Metas' },
] as const

// Las cinco partes de Día a día como pestañas que son rutas (igual que las de un proyecto): cada una tiene
// su URL, así que el botón "atrás" y los enlaces directos funcionan. La píldora oscura se desliza a la
// pestaña elegida, y se mueve al hacer clic sin esperar a que llegue la página.
export function DailyTabs() {
  const pathname = usePathname()
  const target = usePendingHref() ?? pathname

  return (
    <LayoutGroup id="daily-tabs">
      <nav className={styles.tabs} aria-label="Día a día">
        {TABS.map((tab) => {
          const active = tab.href === BASE ? target === BASE : target.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href} className={[styles.tab, active ? styles.active : null].filter(Boolean).join(' ')} aria-current={active ? 'page' : undefined}>
              {active ? <motion.span layoutId="daily-tab-pill" className={styles.pill} transition={SPRING.slide} /> : null}
              <span className={styles.content}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </LayoutGroup>
  )
}
