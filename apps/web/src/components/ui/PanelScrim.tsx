'use client'

import { AnimatePresence, motion } from 'motion/react'

import styles from './PanelScrim.module.css'

// El velo que oscurece un poco el fondo mientras hay un panel flotante abierto (el "+" de captura rápida, el
// pomodoro). Tocar fuera del panel, es decir sobre el velo, lo cierra. Va debajo del panel y del botón "+"
// (que se vuelve "x") y encima del resto de la pantalla, la barra de arriba y la de abajo incluidas.
export function PanelScrim({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.scrim}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
      ) : null}
    </AnimatePresence>
  )
}
