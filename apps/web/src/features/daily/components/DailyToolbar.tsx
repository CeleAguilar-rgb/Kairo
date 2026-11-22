'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import responsive from '@/components/ui/responsive.module.css'
import { EASE_OUT } from '@/lib/motion'

import styles from './DailyToolbar.module.css'

type DailyToolbarProps = {
  // Lo de la izquierda: la fecha de hoy, el selector de semana, el mes…
  children: ReactNode
  // Lo de la derecha: "Editar rutina", "Nueva meta".
  action?: ReactNode
  // En el teléfono la franja no se ve (su texto lo dice ya la pantalla y su acción la hace el "+" flotante).
  desktopOnly?: boolean
}

// La franja bajo las pestañas: a la izquierda en qué día/semana/mes estás, a la derecha la acción de la
// parte (en el canvas esa acción vive en el encabezado; aquí queda junto al contenido al que pertenece).
export function DailyToolbar({ children, action, desktopOnly }: DailyToolbarProps) {
  // Al cambiar de pestaña no sube ni se retrasa: se queda en su lugar y solo cambia lo que dice.
  const calm = useCalmEntry()
  return (
    <motion.div className={[styles.bar, desktopOnly ? responsive.hideOnPhone : null].filter(Boolean).join(' ')} initial={calm ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }}>
      <div className={styles.start}>{children}</div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </motion.div>
  )
}

// Lo secundario de la franja, aparte del texto principal: "rutina Entre semana", el mes del diario. Es una
// pastilla que baja entera a otro renglón si no cabe junto al texto (antes todo era un solo texto con un
// punto medio, y se partía a la mitad: "· rutina" arriba y "Entre semana" abajo).
export function ToolbarChip({ children }: { children: ReactNode }) {
  return <span className={styles.chip}>{children}</span>
}
