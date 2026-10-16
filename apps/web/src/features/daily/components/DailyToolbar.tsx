'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { EASE_OUT } from '@/lib/motion'

import styles from './DailyToolbar.module.css'

type DailyToolbarProps = {
  // Lo de la izquierda: la fecha de hoy, el selector de semana, el mes…
  children: ReactNode
  // Lo de la derecha: "Editar rutina", "Nueva meta".
  action?: ReactNode
}

// La franja bajo las pestañas: a la izquierda en qué día/semana/mes estás, a la derecha la acción de la
// parte (en el canvas esa acción vive en el encabezado; aquí queda junto al contenido al que pertenece).
export function DailyToolbar({ children, action }: DailyToolbarProps) {
  // Al cambiar de pestaña no sube ni se retrasa: se queda en su lugar y solo cambia lo que dice.
  const calm = useCalmEntry()
  return (
    <motion.div className={styles.bar} initial={calm ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }}>
      <div className={styles.start}>{children}</div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </motion.div>
  )
}
