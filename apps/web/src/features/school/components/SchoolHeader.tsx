'use client'

import { motion } from 'motion/react'

import { PageHeading } from '@/components/layout/PageHeading'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { EASE_OUT } from '@/lib/motion'

import type { SchoolMode } from '../types'

import styles from './SchoolHeader.module.css'

type SchoolHeaderProps = {
  mode: SchoolMode
  onModeChange: (mode: SchoolMode) => void
  subtitle: string
  hasTerm: boolean
  onEditTerm: () => void
  onNewSubject: () => void
}

const MODE_OPTIONS: { value: SchoolMode; label: string }[] = [
  { value: 'prep', label: 'Antes de empezar' },
  { value: 'term', label: 'Durante el semestre' },
]

// El encabezado de Escuela.dc.html: título, subtítulo, el tablist "Momento" y
// el botón "Materia" (en el canvas vive en el header fijo, pero ahí solo
// aparece en esta pantalla — igual que "Nuevo proyecto"/"Nueva tarea", va en
// los controles de la página, no en el Topnav global). "Periodo" no está en el
// canvas: sin él no habría dónde definir las fechas del cuatrimestre (de ahí
// sale la cuenta regresiva), así que se agregó como botón secundario.
export function SchoolHeader({
  mode,
  onModeChange,
  subtitle,
  hasTerm,
  onEditTerm,
  onNewSubject,
}: SchoolHeaderProps) {
  return (
    <div className={styles.row}>
      <PageHeading title="Escuela">
        <span className={styles.subtitle}>{subtitle}</span>
      </PageHeading>
      <motion.div
        className={styles.actions}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }}
      >
        <Segmented
          label="Momento"
          tone="glass"
          value={mode}
          onChange={onModeChange}
          options={MODE_OPTIONS}
        />
        <Button variant="secondary" onClick={onEditTerm}>
          {hasTerm ? 'Periodo' : 'Definir periodo'}
        </Button>
        <Button onClick={onNewSubject}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Materia
        </Button>
      </motion.div>
    </div>
  )
}
