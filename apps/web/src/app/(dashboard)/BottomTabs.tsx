'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { usePendingHref } from '@/components/layout/Navigation'
import type { UserSection } from '@/lib/account/api'
import { EASE_OUT, PRESS, SPRING } from '@/lib/motion'

import styles from './BottomTabs.module.css'
import { findActive, navModules, splitTabs } from './nav-modules'

// La barra de secciones del teléfono (AppMas.dc.html, .tabbar): fija abajo, al alcance del pulgar, con las
// primeras 5 secciones del orden de la persona. Las demás van en el menú del avatar (Topnav). Solo existe
// en pantallas angostas (el CSS la esconde arriba de 720px, donde las secciones viven en el Topnav). La
// píldora oscura de la pestaña activa viaja de una a otra igual que la del Topnav (layoutId + SPRING.slide).
export function BottomTabs({ sections }: { sections: UserSection[] }) {
  const pathname = usePathname()
  const pendingHref = usePendingHref()

  const visible = navModules(sections, { mobile: true })
  const { tabs } = splitTabs(visible)
  const activeId = findActive(visible, pendingHref ?? pathname)

  // Con una sola sección no hay a dónde ir: la barra sobra.
  if (visible.length <= 1) return null

  return (
    <nav className={styles.tabbar} aria-label="Secciones">
      {tabs.map((module) => (
        <Tab key={module.id} href={module.href} label={module.label} icon={module.icon} active={module.id === activeId} />
      ))}
    </nav>
  )
}

type TabProps = {
  label: string
  icon: string[]
  active: boolean
  href: string
}

function Tab({ label, icon, active, href }: TabProps) {
  const className = [styles.tab, active ? styles.tabActive : null].filter(Boolean).join(' ')

  return (
    <Link href={href} className={className} aria-current={active ? 'page' : undefined}>
      <motion.span className={styles.iconWrap} whileTap={PRESS.icon} transition={SPRING.pop}>
        {/* layoutDependency: que solo se mida al cambiar de pestaña; la barra está fija y, sin esto, al cambiar
            de página estando abajo la píldora cruzaba la pantalla (ver el mismo caso en Topnav). */}
        {active ? (
          <motion.span
            layoutId="bottomtabs-active"
            layoutDependency={href}
            className={styles.activePill}
            transition={SPRING.slide}
          />
        ) : null}
        <motion.svg
          className={styles.icon}
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          // Al volverse activa, el ícono da un saltito: la pestaña "contesta" al toque.
          animate={active ? { y: [0, -3, 0] } : { y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
        >
          {icon.map((d) => (
            <path key={d} d={d} />
          ))}
        </motion.svg>
      </motion.span>
      <span className={styles.label}>{label}</span>
    </Link>
  )
}
