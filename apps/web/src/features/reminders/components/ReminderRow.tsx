'use client'

import { REMINDER_SNOOZES } from '@kairo/shared'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { DURATION, EASE_OUT, popover, SPRING } from '@/lib/motion'

import { sourceText, whenLabel, type WhenContext } from '../reminder-utils'
import { REMINDER_SNOOZE_LABEL, type Reminder, type ReminderSnooze } from '../types'

import styles from './ReminderRow.module.css'

type ReminderRowProps = {
  reminder: Reminder
  // 'accent': sobre la tarjeta lavanda de "Para hoy"; 'surface': sobre la tarjeta clara de "Más adelante".
  tone: 'accent' | 'surface'
  context: WhenContext
  late: boolean
  // El recordatorio con su hora ya mostrada: cuando cambia lo que está en pantalla, Motion re-mide.
  layoutKey: string
  // Retraso de la entrada escalonada (solo al abrir la pantalla).
  delay: number
  onComplete: (reminder: Reminder) => void
  onSnooze: (reminder: Reminder, option: ReminderSnooze) => void
}

// Una fila de la lista (Recordatorios.dc.html): casilla para marcar como listo, el mensaje, cuándo y de
// dónde viene, y el reloj con el menú "Posponer". La hora va en rojo si ya pasó.
export function ReminderRow({ reminder, tone, context, late, layoutKey, delay, onComplete, onSnooze }: ReminderRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // El menú se cierra con Escape (devolviendo el foco al reloj) o al tocar fuera.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // Flechas arriba y abajo mueven el foco entre las opciones; Tab cierra el menú.
  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') return setMenuOpen(false)
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length
    items[next]?.focus()
  }

  const handleSnooze = (option: ReminderSnooze) => {
    setMenuOpen(false)
    onSnooze(reminder, option)
  }

  return (
    <motion.li
      layout
      layoutDependency={layoutKey}
      // La fila con el menú abierto se pone por encima de las de abajo (cada fila es su propio contexto de apilado).
      className={[styles.row, tone === 'accent' ? styles.onAccent : styles.onSurface, menuOpen ? styles.rowOpen : null].filter(Boolean).join(' ')}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT, delay } }}
      exit={{ opacity: 0, x: 24, transition: { duration: DURATION.base, ease: EASE_OUT } }}
      transition={SPRING.panel}
    >
      <button type="button" className={styles.check} onClick={() => onComplete(reminder)} aria-label={`Marcar como hecho: ${reminder.title}`}>
        <LineIcon d="M5 12l5 5L20 7" size={14} strokeWidth={3} />
      </button>

      <div className={styles.text}>
        <span className={styles.title}>{reminder.title}</span>
        <div className={styles.meta}>
          <span className={[styles.when, late ? styles.late : null].filter(Boolean).join(' ')}>{whenLabel(reminder, context)}</span>
          <span className={styles.source}>{sourceText(reminder.source, reminder.repeat)}</span>
        </div>
      </div>

      <div className={styles.snoozeWrap} ref={wrapRef} onKeyDown={menuOpen ? handleMenuKeyDown : undefined}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.snoozeButton}
          aria-label={`Posponer: ${reminder.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <LineIcon d={['M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M12 9v4l2 2', 'M5 3L2 6M19 3l3 3']} />
        </button>
        <AnimatePresence>
          {menuOpen ? (
            <motion.div className={styles.menu} role="menu" variants={popover} initial="hidden" animate="show" exit="exit">
              <span className={styles.menuCaption}>Posponer</span>
              {REMINDER_SNOOZES.map((option, index) => (
                <button key={option} type="button" role="menuitem" className={styles.menuItem} autoFocus={index === 0} onClick={() => handleSnooze(option)}>
                  {REMINDER_SNOOZE_LABEL[option]}
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.li>
  )
}
