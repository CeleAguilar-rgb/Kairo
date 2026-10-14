'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { focusFirst, useDialogFocus } from '@/lib/use-dialog-focus'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'
import { useMounted } from '@/lib/use-mounted'

import styles from './Drawer.module.css'

type DrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  // Si el título se muestra dentro de children (con su propio estilo), se pasa
  // hideTitle para no duplicarlo; sigue existiendo para lectores de pantalla.
  hideTitle?: boolean
  width?: 'md' | 'lg'
  children: ReactNode
}

// Panel lateral del diseño (detalle de un pendiente, crear tarea, evento…).
// Entra desde la derecha con un resorte y sale con una curva: salir rebotando
// se siente torpe. El manejo de foco y Escape vive en useDialogFocus.
export function Drawer({ open, onClose, title, hideTitle = false, width = 'md', children }: DrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const mounted = useMounted()
  useDialogFocus(open, panelRef, onClose)

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
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
          <motion.aside
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={[styles.panel, width === 'lg' ? styles.lg : null].filter(Boolean).join(' ')}
            initial={{ x: '105%' }}
            animate={{ x: 0, transition: SPRING.panel }}
            exit={{ x: '105%', transition: { duration: DURATION.slow, ease: EASE_OUT } }}
            onAnimationComplete={() => focusFirst(panelRef.current)}
          >
            <h2 id={titleId} className={hideTitle ? styles.srOnly : styles.title}>
              {title}
            </h2>
            {children}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
