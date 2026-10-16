'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { SPRING } from '@/lib/motion'

import styles from './ProgressDial.module.css'

type ProgressDialProps = {
  // 0 a 1
  value: number
  size?: number
  stroke?: number
  // La pista: 'soft' sobre una tarjeta clara, 'border' sobre un fondo crema.
  track?: 'soft' | 'border'
  children?: ReactNode
}

// El anillo de avance de Día a día (Hoy → "Vas 4 de 6", y el detalle de una meta): lavanda fuerte sobre una
// pista clara. El trazo se dibuja con pathLength y sigue al valor con un resorte suave.
export function ProgressDial({ value, size = 96, stroke = 10, track = 'soft', children }: ProgressDialProps) {
  const radius = 40
  const clamped = Math.min(1, Math.max(0, value))

  return (
    <div className={styles.dial} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={styles.svg}>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth={stroke} className={track === 'soft' ? styles.trackSoft : styles.trackBorder} />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={styles.fill}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.001, clamped) }}
          transition={{ ...SPRING.soft, delay: 0.2 }}
        />
      </svg>
      <span className={styles.label}>{children}</span>
    </div>
  )
}
