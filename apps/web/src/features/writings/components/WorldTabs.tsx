'use client'

import { LayoutGroup, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { usePendingHref } from '@/components/layout/Navigation'
import { SPRING } from '@/lib/motion'

import styles from './WritingsTabs.module.css'

const TABS = [
  { slug: '', label: 'Resumen' },
  { slug: '/linea-del-tiempo', label: 'Línea del tiempo' },
  { slug: '/regiones', label: 'Regiones' },
  { slug: '/historias', label: 'Historias' },
  { slug: '/personajes', label: 'Personajes' },
  { slug: '/especies', label: 'Especies' },
] as const

// Las seis partes de un mundo como pestañas que son rutas (igual que las de un proyecto): cada una tiene su URL, así
// que el botón "atrás" y los enlaces directos funcionan. Comparte los estilos de las pestañas de Escritos.
// `data-tab-switch` le dice a la navegación que esto es cambiar de pestaña, no de pantalla.
export function WorldTabs({ worldId }: { worldId: string }) {
  const base = `/escritos/mundos/${worldId}`
  const pathname = usePathname()
  const target = (usePendingHref() ?? pathname).split('?')[0]

  return (
    <LayoutGroup id="world-tabs">
      <nav className={styles.tabs} aria-label="Secciones del mundo" data-tab-switch>
        {TABS.map((tab) => {
          const href = `${base}${tab.slug}`
          const active = tab.slug === '' ? target === base : target.startsWith(href)
          return (
            <Link key={tab.label} href={href} className={[styles.tab, active ? styles.active : null].filter(Boolean).join(' ')} aria-current={active ? 'page' : undefined}>
              {active ? <motion.span layoutId="world-tab-pill" className={styles.pill} transition={SPRING.slide} /> : null}
              <span className={styles.content}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </LayoutGroup>
  )
}
