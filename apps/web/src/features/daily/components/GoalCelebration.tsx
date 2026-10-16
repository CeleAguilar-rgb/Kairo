'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '@/components/ui/Button'
import { Doodle, type DoodleKind } from '@/components/ui/Doodle'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'
import { focusFirst, useDialogFocus } from '@/lib/use-dialog-focus'
import { useMounted } from '@/lib/use-mounted'

import styles from './GoalCelebration.module.css'

type GoalCelebrationProps = {
  // El título de la meta que se acaba de lograr; null = cerrado.
  title: string | null
  onClose: () => void
  onSeeShowcase: () => void
}

// Los doodles que salen disparados de la tarjeta: hacia dónde (px), cuánto giran y de qué tipo.
const BURSTS: { x: number; y: number; rotate: number; kind: DoodleKind }[] = [
  { x: -150, y: -110, rotate: -20, kind: 'star' },
  { x: 140, y: -120, rotate: 25, kind: 'heart' },
  { x: -170, y: 30, rotate: 15, kind: 'bolt' },
  { x: 165, y: 20, rotate: -30, kind: 'star' },
  { x: -110, y: 140, rotate: 40, kind: 'spiral' },
  { x: 120, y: 130, rotate: -15, kind: 'star' },
  { x: 0, y: -160, rotate: 10, kind: 'heart' },
  { x: 20, y: 170, rotate: 30, kind: 'bolt' },
]

// "¡Lo lograste!" (Metas.dc.html): la tarjeta salta con un rebote y los doodles salen disparados. Con
// movimiento reducido los doodles ya están en su lugar, sin recorrido.
export function GoalCelebration({ title, onClose, onSeeShowcase }: GoalCelebrationProps) {
  const open = title !== null
  const titleId = useId()
  const cardRef = useRef<HTMLDivElement>(null)
  const mounted = useMounted()
  useDialogFocus(open, cardRef, onClose)

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="party"
          className={styles.layer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.base } }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={styles.card}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 15 } }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: DURATION.base, ease: EASE_OUT } }}
            onAnimationComplete={() => focusFirst(cardRef.current)}
          >
            {BURSTS.map((burst, index) => (
              <motion.span
                key={index}
                className={styles.burst}
                aria-hidden="true"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.3, rotate: 0 }}
                animate={{ opacity: 1, x: burst.x, y: burst.y, scale: 1, rotate: burst.rotate, transition: { duration: 1, ease: EASE_OUT, delay: index * 0.04 } }}
              >
                <Doodle kind={burst.kind} size={34} strokeWidth={2} />
              </motion.span>
            ))}
            <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0, transition: { ...SPRING.pop, delay: 0.15 } }}>
              <Doodle kind="star" size={96} strokeWidth={1.6} />
            </motion.span>
            <h2 id={titleId} className={styles.heading}>
              ¡Lo lograste!
            </h2>
            <span className={styles.goal}>{title}</span>
            <span className={styles.hint}>Ya está en tu vitrina de logradas.</span>
            <div className={styles.actions}>
              <Button variant="ghost" onClick={onClose}>
                Seguir
              </Button>
              <Button onClick={onSeeShowcase}>Ver la vitrina</Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
