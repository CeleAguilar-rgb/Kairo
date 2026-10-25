'use client'

import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { usePendingHref } from '@/components/layout/Navigation'
import { LineIcon } from '@/components/ui/Card'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'

import { createSectionAction, updateWorldAction } from '../../world-actions'
import { sectionEntries, splitTabs, type WorldTab } from '../../world-utils'
import colors from '../WritingColors.module.css'
import tabStyles from '../WritingsTabs.module.css'

import styles from './WorldTabBar.module.css'
import { useWorld } from './WorldContext'

// La barra de pestañas de un mundo (Escritos.dc.html): las que se eligieron, en su orden, y "Más" con las demás.
// En "Más" se fija una pestaña con el alfiler, se abre "Personalizar pestañas" o se crea una sección nueva. Las
// pestañas son rutas (como las de un proyecto): "atrás" y los enlaces directos funcionan, y `data-tab-switch` le
// dice a la navegación que esto es cambiar de pestaña, no de pantalla.
export function WorldTabBar() {
  const { bundle, base, open, run } = useWorld()
  const pathname = usePathname()
  const router = useRouter()
  const target = (usePendingHref() ?? pathname).split('?')[0]!
  const [moreOpen, setMoreOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const { bar, more } = splitTabs(bundle)
  const isActive = (tab: WorldTab) => (tab.id === 'resumen' ? target === base : target.startsWith(tab.href))
  const hiddenActive = more.find(isActive)

  // Se cierra al tocar fuera del menú o con Escape.
  useEffect(() => {
    if (!moreOpen) return
    const close = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  // El alfiler: la pestaña pasa al final de la barra.
  function pin(tab: WorldTab) {
    run(() => updateWorldAction(bundle.world.id, { tabs: [...bar.map((item) => item.id), tab.id] }))
  }

  // "Nueva sección": se crea, se abre su pestaña y su editor de plantilla, para decidir qué lleva cada nota.
  function newSection() {
    setMoreOpen(false)
    run(() => createSectionAction(bundle.world.id, { name: 'Sección nueva' }), {
      onDone: (result) => {
        if (!result.id) return
        router.push(`${base}/seccion/${result.id}`)
        open({ kind: 'template', id: result.id, backEntryId: null })
      },
    })
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <LayoutGroup id="world-tabs">
        <nav className={tabStyles.tabs} aria-label={`Secciones de ${bundle.world.name}`} data-tab-switch>
          {bar.map((tab) => {
            const active = isActive(tab)
            return (
              <Link key={tab.id} href={tab.href} className={[tabStyles.tab, active ? tabStyles.active : null].filter(Boolean).join(' ')} aria-current={active ? 'page' : undefined}>
                {active ? <motion.span layoutId="world-tab-pill" className={tabStyles.pill} transition={SPRING.slide} /> : null}
                <span className={tabStyles.content}>{tab.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            className={[tabStyles.tab, styles.moreButton, hiddenActive ? tabStyles.active : null, moreOpen && !hiddenActive ? styles.moreOpen : null].filter(Boolean).join(' ')}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((value) => !value)}
          >
            {hiddenActive ? <motion.span layoutId="world-tab-pill" className={tabStyles.pill} transition={SPRING.slide} /> : null}
            <span className={tabStyles.content}>
              {hiddenActive?.label ?? 'Más'}
              <LineIcon d="M6 9l6 6 6-6" size={14} strokeWidth={2.2} />
            </span>
          </button>
        </nav>
      </LayoutGroup>

      <AnimatePresence>
        {moreOpen ? (
          <motion.div
            className={styles.pop}
            role="menu"
            aria-label="Más secciones"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: SPRING.pop }}
            exit={{ opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
          >
            <span className={styles.popLabel}>Secciones de este mundo</span>
            {more.map((tab) => (
              <div key={tab.id} className={styles.popRow}>
                <Link href={tab.href} role="menuitem" className={styles.popItem} onClick={() => setMoreOpen(false)}>
                  <span className={[styles.popIcon, colors[`tone_${tab.template?.color ?? 'muted'}`]].join(' ')}>{tab.label.charAt(0)}</span>
                  <span className={styles.popName}>{tab.label}</span>
                  {tab.template ? <span className={styles.popCount}>{sectionEntries(bundle, tab.template.id).length}</span> : null}
                </Link>
                <button type="button" className={styles.pin} aria-label={`Fijar en la barra: ${tab.label}`} onClick={() => pin(tab)}>
                  <LineIcon d={['M9 4h6l-1 6 4 4H6l4-4-1-6z', 'M12 14v6']} size={16} />
                </button>
              </div>
            ))}
            {more.length === 0 ? <span className={styles.popEmpty}>Todas tus secciones están en la barra.</span> : null}
            <button
              type="button"
              role="menuitem"
              className={styles.popItem}
              onClick={() => {
                setMoreOpen(false)
                open({ kind: 'tabs' })
              }}
            >
              <span className={[styles.popIcon, colors.tone_muted].join(' ')}>
                <LineIcon d="M14 4l6 6L9 21H3v-6L14 4z" size={16} />
              </span>
              Personalizar pestañas
            </button>
            <button type="button" role="menuitem" className={[styles.popItem, styles.popNew].join(' ')} onClick={newSection}>
              <span className={[styles.popIcon, styles.popIconDashed].join(' ')}>+</span>
              Nueva sección
            </button>
            <span className={styles.popFoot}>Fija con el alfiler las que quieras ver en la barra.</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
