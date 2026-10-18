'use client'

import { AnimatePresence, motion } from 'motion/react'

import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'

import styles from './Checkbox.module.css'

type CheckboxProps = {
  checked: boolean
  onToggle: () => void
  label: string
  // 'inverted' para usarlo sobre --surface-inverted (tarjeta destacada); 'danger' para lo que ya se atrasó (rutina).
  tone?: 'surface' | 'inverted' | 'danger'
  className?: string
}

// La microanimación de "marcar un pendiente" (docs/guides/theming.md): la caja
// se llena con un rebote corto, la palomita se dibuja de izquierda a derecha y
// un anillo de acento se expande y desvanece detrás, como una onda.
export function Checkbox({ checked, onToggle, label, tone = 'surface', className }: CheckboxProps) {
  const classes = [styles.checkbox, tone === 'inverted' ? styles.inverted : null, tone === 'danger' ? styles.danger : null, checked ? styles.checked : null, className]
    .filter(Boolean)
    .join(' ')

  return (
    <motion.button
      type="button"
      aria-pressed={checked}
      aria-label={label}
      onClick={onToggle}
      className={classes}
      initial={false}
      whileTap={{ scale: 0.86 }}
      animate={checked ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      <AnimatePresence initial={false}>
        {checked ? (
          <motion.span
            key="ripple"
            className={styles.ripple}
            aria-hidden="true"
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 1.9, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          />
        ) : null}
      </AnimatePresence>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <motion.path
          d="M5 12l5 5L20 7"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={checked ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={checked ? { ...SPRING.pop, delay: 0.04 } : { duration: DURATION.fast }}
        />
      </svg>
    </motion.button>
  )
}
