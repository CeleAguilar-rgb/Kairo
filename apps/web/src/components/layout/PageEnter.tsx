'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { EASE_OUT } from '@/lib/motion'

// Entrada de una página: un fundido corto, SIN desplazamiento. Empieza en 0.8 y no más
// abajo a propósito: antes de esta página hay una de dos cosas, la pantalla de carga
// (al 100%) o la página vieja atenuada (~75%), y entrar desde mucho menos se vería como
// un parpadeo en el cambio. Con 0.8 la curva de opacidad es continua en los dos casos.
// Va DENTRO de cada page.tsx y no en el layout o en template.tsx a propósito: una
// página dinámica llega después de que empieza la navegación (hay que esperar sus
// datos), y la animación tiene que ocurrir cuando el contenido de verdad aparece.
export function PageEnter({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}
