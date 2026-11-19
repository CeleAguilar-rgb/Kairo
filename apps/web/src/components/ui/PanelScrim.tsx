'use client'

import { AnimatePresence, motion } from 'motion/react'

import styles from './PanelScrim.module.css'

// El velo que oscurece un poco el fondo mientras hay un panel flotante abierto (el "+" de captura rápida, el
// pomodoro). Tocar fuera del panel, es decir sobre el velo, lo cierra. Va debajo del panel y del botón "+"
// (que se vuelve "x") y encima del resto de la pantalla, la barra de arriba y la de abajo incluidas.
// `mobileOnly`: para los menús que en la compu cuelgan de su botón (avatar, doodles, avisos): ahí no oscurecen
// nada, solo en el teléfono, donde se abren al centro.
export function PanelScrim({ open, onClose, mobileOnly = false }: { open: boolean; onClose: () => void; mobileOnly?: boolean }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={[styles.scrim, mobileOnly ? styles.mobileOnly : null].filter(Boolean).join(' ')}
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
