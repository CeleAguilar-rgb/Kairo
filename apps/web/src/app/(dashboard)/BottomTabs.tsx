'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { usePendingHref } from '@/components/layout/Navigation'
import type { UserSection } from '@/lib/account/api'
import { DURATION, EASE_OUT, listItem, SPRING, staggerList } from '@/lib/motion'
import type { ModuleManifest } from '@/lib/modules/registry'
import { focusFirst, useDialogFocus } from '@/lib/use-dialog-focus'
import { useMounted } from '@/lib/use-mounted'
import { useNarrowScreen } from '@/lib/use-narrow-screen'

import styles from './BottomTabs.module.css'
import { findActive, navModules, splitTabs } from './nav-modules'

// Ícono de "Más" del canvas (tres puntos).
const MORE_ICON = [
  'M5 10.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z',
  'M12 10.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z',
  'M19 10.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z',
]

// La barra de secciones del teléfono (AppMas.dc.html, .tabbar): fija abajo, al alcance del pulgar, con
// Inicio, Tareas, Agenda, Día a día y "Más". Solo existe en pantallas angostas (el CSS la esconde arriba
// de 720px, donde las secciones viven en el Topnav). La píldora oscura de la pestaña activa viaja de una
// a otra igual que la del Topnav (layoutId + SPRING.slide).
export function BottomTabs({ sections }: { sections: UserSection[] }) {
  const pathname = usePathname()
  const pendingHref = usePendingHref()
  const narrow = useNarrowScreen()
  const [moreRequested, setMoreOpen] = useState(false)
  // La hoja solo existe en el teléfono: si la ventana se agranda con ella abierta, se va sola.
  const moreOpen = moreRequested && narrow

  const visible = navModules(sections)
  const { tabs, more } = splitTabs(visible)
  const activeId = findActive(visible, pendingHref ?? pathname)
  const moreActive = more.some((module) => module.id === activeId)

  return (
    <>
      <nav className={styles.tabbar} aria-label="Secciones">
        {tabs.map((module) => (
          <Tab key={module.id} href={module.href} label={module.label} icon={module.icon} active={module.id === activeId && !moreOpen} />
        ))}
        {more.length > 0 ? (
          <Tab
            label="Más"
            icon={MORE_ICON}
            active={moreOpen || moreActive}
            expanded={moreOpen}
            onClick={() => setMoreOpen(!moreOpen)}
          />
        ) : null}
      </nav>

      <MoreSheet open={moreOpen} modules={more} activeId={activeId} onClose={() => setMoreOpen(false)} />
    </>
  )
}

type TabProps = {
  label: string
  icon: string[]
  active: boolean
  href?: string
  expanded?: boolean
  onClick?: () => void
}

function Tab({ label, icon, active, href, expanded, onClick }: TabProps) {
  const content = (
    <>
      <motion.span className={styles.iconWrap} whileTap={{ scale: 0.92 }} transition={SPRING.pop}>
        {active ? <motion.span layoutId="bottomtabs-active" className={styles.activePill} transition={SPRING.slide} /> : null}
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
    </>
  )

  const className = [styles.tab, active ? styles.tabActive : null].filter(Boolean).join(' ')

  if (href) {
    return (
      <Link href={href} className={className} aria-current={active ? 'page' : undefined}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" className={className} aria-expanded={expanded} aria-haspopup="dialog" onClick={onClick}>
      {content}
    </button>
  )
}

type MoreSheetProps = {
  open: boolean
  modules: ModuleManifest[]
  activeId: string | null
  onClose: () => void
}

// "Más": una hoja que sube desde abajo con las secciones que no caben en la barra. Escape, el fondo o
// elegir una sección la cierran; el foco entra a la hoja y regresa al botón (useDialogFocus).
function MoreSheet({ open, modules, activeId, onClose }: MoreSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const mounted = useMounted()
  useDialogFocus(open, sheetRef, onClose)

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="scrim"
            className={styles.scrim}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE_OUT }}
          />
          <motion.div
            key="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            className={styles.sheet}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: SPRING.panel }}
            exit={{ y: '100%', transition: { duration: DURATION.slow, ease: EASE_OUT } }}
            // Como el Drawer: el foco entra cuando la hoja ya llegó, no a medio camino.
            onAnimationComplete={() => focusFirst(sheetRef.current)}
          >
            <span className={styles.grabber} aria-hidden="true" />
            <h2 className={styles.sheetTitle}>Más secciones</h2>
            <motion.ul className={styles.list} variants={staggerList(0.04, 0.08)} initial="hidden" animate="show">
              {modules.map((module) => {
                const active = module.id === activeId
                return (
                  <motion.li key={module.id} variants={listItem}>
                    <Link
                      href={module.href}
                      className={[styles.row, active ? styles.rowActive : null].filter(Boolean).join(' ')}
                      aria-current={active ? 'page' : undefined}
                      onClick={onClose}
                    >
                      <span className={styles.rowIcon}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          {module.icon.map((d) => (
                            <path key={d} d={d} />
                          ))}
                        </svg>
                      </span>
                      {module.label}
                      <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </Link>
                  </motion.li>
                )
              })}
            </motion.ul>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
