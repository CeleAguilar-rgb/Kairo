'use client'

import { LayoutGroup, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { usePendingHref } from '@/components/layout/Navigation'
import { SPRING } from '@/lib/motion'

import styles from './WritingsTabs.module.css'

const BASE = '/escritos'

const TABS = [
  { href: BASE, label: 'Historias', key: 'books' },
  { href: `${BASE}/notas`, label: 'Notas', key: 'notes' },
  { href: `${BASE}/personajes`, label: 'Personajes', key: 'characters' },
  { href: `${BASE}/mundos`, label: 'Mundos', key: 'worlds' },
] as const

export type WritingsTabCounts = { books: number; notes: number; characters: number; worlds: number }

// Las cuatro partes de Escritos como pestañas que son rutas (igual que las de Finanzas y Día a día): cada una
// tiene su URL, así que el botón "atrás" y los enlaces directos funcionan. La píldora oscura se desliza a la
// pestaña elegida, y se mueve al hacer clic sin esperar a que llegue la página. `data-tab-switch` le dice a la
// navegación que esto es cambiar de pestaña, no de pantalla (ver Navigation.tsx y SectionPanel.tsx).
export function WritingsTabs({ counts }: { counts: WritingsTabCounts }) {
  const pathname = usePathname()
  const target = usePendingHref() ?? pathname

  return (
    <LayoutGroup id="writings-tabs">
      <nav className={styles.tabs} aria-label="Escritos" data-tab-switch>
        {TABS.map((tab) => {
          const active = tab.href === BASE ? target === BASE : target.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href} className={[styles.tab, active ? styles.active : null].filter(Boolean).join(' ')} aria-current={active ? 'page' : undefined}>
              {active ? <motion.span layoutId="writings-tab-pill" className={styles.pill} transition={SPRING.slide} /> : null}
              <span className={styles.content}>
                {tab.label}
                <span className={styles.count}>{counts[tab.key]}</span>
              </span>
            </Link>
          )
        })}
      </nav>
    </LayoutGroup>
  )
}
