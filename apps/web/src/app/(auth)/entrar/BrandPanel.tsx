'use client'

import { motion } from 'motion/react'
import styles from './page.module.css'

const EASE = [0.3, 0.7, 0.2, 1] as const

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

export function BrandPanel() {
  return (
    <motion.aside className={styles.brand} variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className={styles.logo}>
        <svg width="32" height="32" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path
            d="M 50 16 A 34 34 0 1 1 16 50"
            style={{ stroke: 'var(--text-on-inverted)' }}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <circle
            cx="26"
            cy="26"
            r="9"
            style={{ fill: 'var(--accent)', stroke: 'var(--text-on-inverted)' }}
            strokeWidth="3.5"
          />
        </svg>
        kairo
      </motion.div>

      <svg
        className={styles.float1}
        width="80"
        height="80"
        viewBox="0 0 40 40"
        fill="none"
        style={{ stroke: 'var(--text-on-inverted)' }}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path
          d="M20 6l3.6 8.2 8.9.8-6.7 5.9 2 8.7L20 25l-7.8 4.6 2-8.7-6.7-5.9 8.9-.8L20 6z"
          style={{ fill: 'var(--accent)' }}
        />
      </svg>
      <svg
        className={styles.float2}
        width="64"
        height="64"
        viewBox="0 0 40 40"
        fill="none"
        style={{ stroke: 'var(--text-on-inverted)' }}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path
          d="M20 32s-11-7-11-15a6 6 0 0 1 11-3.4A6 6 0 0 1 31 17c0 8-11 15-11 15z"
          style={{ fill: 'var(--accent-ink)' }}
        />
      </svg>
      <svg
        className={styles.float3}
        width="70"
        height="70"
        viewBox="0 0 40 40"
        fill="none"
        style={{ stroke: 'var(--text-on-inverted)' }}
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M21 20.4c.6-1.8-1.6-2.8-3-1.6-1.8 1.6-.4 4.6 2 4.8 3.4.2 5.2-3.6 3.6-6.6-2-3.6-7.2-3.6-9.6-.4-2.8 3.8-.6 9.6 4.2 10.6 5.4 1.2 10.2-3 10-8.4" />
      </svg>

      <motion.div variants={item} className={styles.tagline}>
        <span className={styles.taglineTitle}>
          Toda tu vida en
          <br />
          un solo tablero.
        </span>
        <span className={styles.taglineSubtitle}>Tareas, agenda, dinero, rutina y escritos, a tu manera.</span>
      </motion.div>
    </motion.aside>
  )
}
