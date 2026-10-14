'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'
import { focusFirst, useDialogFocus } from '@/lib/use-dialog-focus'
import { useMounted } from '@/lib/use-mounted'

import styles from './Modal.module.css'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  // 'danger': confirmación de borrar (ícono de bote, role="alertdialog").
  tone?: 'default' | 'danger'
  icon?: ReactNode
  children?: ReactNode
  actions: ReactNode
}

// Diálogo centrado (pantalla Borrar del canvas). Aparece creciendo un poco
// desde el centro con un resorte y se va encogiéndose rápido, sin rebote.
export function Modal({ open, onClose, title, description, tone = 'default', icon, children, actions }: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const mounted = useMounted()
  useDialogFocus(open, dialogRef, onClose)

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className={styles.layer}>
          <motion.div
            key="scrim"
            className={styles.scrim}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
          <motion.div
            key="dialog"
            ref={dialogRef}
            role={tone === 'danger' ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className={styles.dialog}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: SPRING.panel }}
            exit={{ opacity: 0, scale: 0.97, y: 6, transition: { duration: DURATION.base, ease: EASE_OUT } }}
            onAnimationComplete={() => focusFirst(dialogRef.current)}
          >
            {icon ? (
              <motion.span
                className={[styles.icon, tone === 'danger' ? styles.iconDanger : null].filter(Boolean).join(' ')}
                initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1, transition: { ...SPRING.pop, delay: 0.08 } }}
              >
                {icon}
              </motion.span>
            ) : null}
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            ) : null}
            {children}
            <div className={styles.actions}>{actions}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
