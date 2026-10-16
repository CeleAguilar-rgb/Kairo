'use client'

import { LayoutGroup, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { LineIcon } from '@/components/ui/Card'
import { usePendingHref } from '@/components/layout/Navigation'
import { SPRING } from '@/lib/motion'

import styles from './ProjectTabs.module.css'

// Los iconos de las tres pestañas, del canvas.
const TABS = [
  { slug: '', label: 'Resumen', icon: ['M4 5h16M4 10h16M4 15h10M4 20h7'] },
  { slug: '/sprints', label: 'Sprints', icon: ['M4 12a8 8 0 1 1 3 6.2', 'M4 19v-5h5'] },
  { slug: '/archivos', label: 'Archivos', icon: ['M6 3h8l4 4v14H6z', 'M14 3v4h4'] },
] as const

// Las partes del proyecto (Resumen, Sprints, Archivos) como pestañas que son rutas: cada una
// tiene su URL, así que el botón "atrás" y los enlaces directos funcionan. La píldora oscura
// se desliza a la pestaña elegida, y se mueve al hacer clic sin esperar a que llegue la página
// (igual que el menú de arriba). `data-tab-switch` le dice a la navegación que esto es cambiar de pestaña,
// no de pantalla (ver Navigation.tsx y SectionPanel.tsx).
export function ProjectTabs({ projectId }: { projectId: string }) {
  const base = `/proyectos/${projectId}`
  const pathname = usePathname()
  const target = usePendingHref() ?? pathname

  return (
    <LayoutGroup id="project-tabs">
      <nav className={styles.tabs} aria-label="Partes del proyecto" data-tab-switch>
        {TABS.map((tab) => {
          const href = `${base}${tab.slug}`
          const active = tab.slug === '' ? target === base : target.startsWith(href)
          return (
            <Link key={tab.label} href={href} className={[styles.tab, active ? styles.active : null].filter(Boolean).join(' ')} aria-current={active ? 'page' : undefined}>
              {active ? <motion.span layoutId="project-tab-pill" className={styles.pill} transition={SPRING.slide} /> : null}
              <span className={styles.content}>
                <LineIcon d={[...tab.icon]} size={16} />
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </LayoutGroup>
  )
}
