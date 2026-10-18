'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { EASE_OUT } from '@/lib/motion'

import styles from './FinanceToolbar.module.css'

type FinanceToolbarProps = {
  // Lo de la izquierda: el selector de mes, los totales de membresías…
  children?: ReactNode
  // Lo de la derecha: "Movimiento", "Nueva categoría".
  action?: ReactNode
}

// La franja bajo las pestañas: a la izquierda en qué mes estás (o un total), a la derecha la acción de la parte.
export function FinanceToolbar({ children, action }: FinanceToolbarProps) {
  // Al cambiar de pestaña no sube ni se retrasa: se queda en su lugar y solo cambia lo que dice.
  const calm = useCalmEntry()
  return (
    <motion.div className={styles.bar} initial={calm ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }}>
      <div className={styles.start}>{children}</div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </motion.div>
  )
}
