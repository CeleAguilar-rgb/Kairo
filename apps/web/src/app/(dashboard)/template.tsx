'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { EASE_OUT } from '@/lib/motion'

// A diferencia de layout.tsx, un template se vuelve a montar en cada
// navegación: es el lugar natural para la entrada de cada página. El Topnav
// (en el layout) no se re-monta, así que la píldora activa puede deslizarse
// mientras el contenido nuevo aparece.
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}
