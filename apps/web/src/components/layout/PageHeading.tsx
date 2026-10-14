'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { Doodle, type DoodleKind } from '@/components/ui/Doodle'
import { EASE_OUT, SPRING } from '@/lib/motion'

import styles from './PageHeading.module.css'

type PageHeadingProps = {
  title: string
  // El doodle que acompaña al título (el rayo de Tareas, la estrella de Proyectos).
  doodle?: DoodleKind
  // Inclinación final del doodle, en grados.
  doodleRotate?: number
  squiggleWidth?: number
  // Sin el garabato bajo el título (el formulario de proyecto solo lleva título).
  squiggle?: boolean
  // Lo que va bajo el garabato: el resumen de la pantalla, los chips del proyecto…
  children?: ReactNode
}

// El encabezado que comparten las pantallas del canvas: título a mano, un doodle que
// "aparece" con rebote y un garabato lavanda que se dibuja debajo. Cada elemento entra
// con su propio retraso para que la pantalla se arme de arriba hacia abajo.
export function PageHeading({ title, doodle, doodleRotate = 10, squiggleWidth = 200, squiggle = true, children }: PageHeadingProps) {
  return (
    <div className={styles.heading}>
      <div className={styles.titleRow}>
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
        >
          {title}
        </motion.h1>
        {doodle ? (
          <motion.span
            className={styles.doodle}
            initial={{ scale: 0, rotate: doodleRotate - 60 }}
            animate={{ scale: 1, rotate: doodleRotate }}
            transition={{ ...SPRING.pop, delay: 0.5 }}
            whileHover={{ rotate: -doodleRotate, scale: 1.1 }}
          >
            <Doodle kind={doodle} size={44} />
          </motion.span>
        ) : null}
      </div>
      {squiggle ? (
      <svg
        className={styles.squiggle}
        width={squiggleWidth}
        height="14"
        viewBox="0 0 300 16"
        fill="none"
        aria-hidden="true"
      >
        <motion.path
          d="M3 10c22-8 40 6 64-1s40-8 62 0 44 7 66-1 46-6 72 3 30-3 30-3"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
        />
      </svg>
      ) : null}
      {children}
    </div>
  )
}
