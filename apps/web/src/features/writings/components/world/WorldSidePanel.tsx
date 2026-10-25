'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { LineIcon } from '@/components/ui/Card'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'
import { focusFirst, useDialogFocus } from '@/lib/use-dialog-focus'
import { useMounted } from '@/lib/use-mounted'

import { EntryPanel } from './EntryPanel'
import { EraPanel } from './EraPanel'
import { EventPanel } from './EventPanel'
import { StatsPanel, TabsPanel } from './CustomizePanels'
import { TemplatePanel } from './TemplatePanel'
import { useWorld, type WorldPanel } from './WorldContext'
import styles from './WorldSidePanel.module.css'

// El panel de la derecha del mundo (Escritos.dc.html, `.drawer`): una ficha, una era, un evento, una plantilla, las
// pestañas o los contadores. Hay uno solo para todo el mundo: abrir otra cosa reemplaza lo que había, y cambiar de
// pestaña no lo cierra. Escape, el velo o la ✕ lo cierran; el foco vuelve a lo que lo abrió.
export function WorldSidePanel() {
  const { panel, close } = useWorld()
  const ref = useRef<HTMLElement>(null)
  const mounted = useMounted()
  useDialogFocus(panel !== null, ref, close)

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {panel ? (
        <>
          <motion.div key="scrim" className={styles.scrim} onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} />
          <motion.aside
            key="panel"
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="world-panel-title"
            className={styles.panel}
            initial={{ x: '104%' }}
            animate={{ x: 0, transition: SPRING.panel }}
            exit={{ x: '104%', transition: { duration: DURATION.slow, ease: EASE_OUT } }}
            onAnimationComplete={() => focusFirst(ref.current)}
          >
            {/* `key`: al pasar de una ficha a otra el contenido empieza de cero (no arrastra lo que se escribía). */}
            <PanelContent key={keyOf(panel)} panel={panel} />
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

const keyOf = (panel: WorldPanel) => ('id' in panel ? `${panel.kind}-${panel.id}` : panel.kind)

function PanelContent({ panel }: { panel: WorldPanel }) {
  switch (panel.kind) {
    case 'entry':
      return <EntryPanel id={panel.id} startEditing={panel.edit} />
    case 'era':
      return <EraPanel id={panel.id} />
    case 'event':
      return <EventPanel id={panel.id} startEditing={panel.edit} />
    case 'template':
      return <TemplatePanel id={panel.id} backEntryId={panel.backEntryId} />
    case 'tabs':
      return <TabsPanel />
    case 'stats':
      return <StatsPanel />
  }
}

type PanelLayoutProps = {
  // Lo que se lee arriba en gris ("Especie · Vadronia", "Línea del tiempo · Era II").
  kicker: string
  // "‹ Vadronia": volver a la ficha de donde se llegó (un lugar a su padre, una plantilla a su ficha).
  back?: { label: string; onClick: () => void } | null
  footer?: ReactNode
  children: ReactNode
}

// La forma común de todo lo que va en el panel: encabezado fijo, cuerpo con scroll y pie fijo.
export function PanelLayout({ kicker, back, footer, children }: PanelLayoutProps) {
  const { close } = useWorld()
  return (
    <>
      <div className={styles.head}>
        {back ? (
          <button type="button" className={styles.crumb} onClick={back.onClick}>
            <LineIcon d="M15 6l-6 6 6 6" size={16} strokeWidth={2} />
            {back.label}
          </button>
        ) : null}
        <span className={styles.kicker}>{kicker}</span>
        <button type="button" className={styles.close} aria-label="Cerrar panel" onClick={close}>
          <LineIcon d="M6 6l12 12M18 6L6 18" size={18} strokeWidth={2} />
        </button>
      </div>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.foot}>{footer}</div> : null}
    </>
  )
}
