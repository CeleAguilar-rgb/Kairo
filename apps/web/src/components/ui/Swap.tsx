'use client'

import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useState, type ReactNode } from 'react'

import { DURATION, EASE_OUT } from '@/lib/motion'

import styles from './Swap.module.css'

type SwapProps = {
  // Lo que cambia. Cada vez que es distinto, lo de antes se desvanece y entra lo nuevo.
  value: string | number
  // Lo que se muestra; si no viene, el propio `value`.
  children?: ReactNode
  className?: string
}

// Si al subir el número lo nuevo entra desde abajo; al bajar, desde arriba (como un contador).
const variants: Variants = {
  enter: (direction: number) => ({ opacity: 0, y: `${direction * 0.4}em`, filter: 'blur(2px)' }),
  center: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: (direction: number) => ({
    opacity: 0,
    y: `${direction * -0.4}em`,
    filter: 'blur(2px)',
    transition: { duration: DURATION.fast, ease: EASE_OUT },
  }),
}

// Un texto o número que cambia en su lugar ("2/5", "Tienes 3 pendientes"): en vez de saltar de golpe, lo de
// antes se desvanece y lo nuevo entra con un desenfoque leve (docs/guides/theming.md, Animación). Para un
// número que debe contar hasta su valor (estadísticas, montos) está CountUp.
//
// Lectores de pantalla: leen solo el texto escondido de abajo, que siempre tiene el valor actual; las dos
// copias que se animan llevan aria-hidden.
export function Swap({ value, children, className }: SwapProps) {
  const [last, setLast] = useState(value)
  const [direction, setDirection] = useState(1)
  // Ajustar el estado mientras se dibuja cuando cambia la prop (patrón de React), sin un efecto de más.
  if (value !== last) {
    setDirection(typeof value === 'number' && typeof last === 'number' && value < last ? -1 : 1)
    setLast(value)
  }
  const content = children ?? value

  return (
    <span className={[styles.swap, className].filter(Boolean).join(' ')}>
      <span className={styles.srOnly}>{content}</span>
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.span
          key={String(value)}
          className={styles.item}
          aria-hidden="true"
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {content}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
