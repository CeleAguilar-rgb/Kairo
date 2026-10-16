'use client'

import { LayoutGroup, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { usePendingHref } from '@/components/layout/Navigation'
import { SPRING } from '@/lib/motion'

import styles from './FinanceTabs.module.css'

const BASE = '/finanzas'

const TABS = [
  { href: BASE, label: 'Resumen' },
  { href: `${BASE}/movimientos`, label: 'Movimientos' },
  { href: `${BASE}/ahorros`, label: 'Ahorros y deudas' },
  { href: `${BASE}/membresias`, label: 'Membresías' },
  { href: `${BASE}/presupuesto`, label: 'Presupuesto' },
] as const

// Las cinco partes de Finanzas como pestañas que son rutas (igual que las de Día a día): cada una tiene su URL,
// así que el botón "atrás" y los enlaces directos funcionan. La píldora oscura se desliza a la pestaña elegida,
// y se mueve al hacer clic sin esperar a que llegue la página. `data-tab-switch` le dice a la navegación que
// esto es cambiar de pestaña, no de pantalla (ver Navigation.tsx y SectionPanel.tsx).
export function FinanceTabs() {
  const pathname = usePathname()
  const target = usePendingHref() ?? pathname

  return (
    <LayoutGroup id="finance-tabs">
      <nav className={styles.tabs} aria-label="Finanzas" data-tab-switch>
        {TABS.map((tab) => {
          const active = tab.href === BASE ? target === BASE : target.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href} className={[styles.tab, active ? styles.active : null].filter(Boolean).join(' ')} aria-current={active ? 'page' : undefined}>
              {active ? <motion.span layoutId="finance-tab-pill" className={styles.pill} transition={SPRING.slide} /> : null}
              <span className={styles.content}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </LayoutGroup>
  )
}
