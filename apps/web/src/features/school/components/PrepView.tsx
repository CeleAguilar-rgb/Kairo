'use client'

import Link from 'next/link'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { fadeUp, staggerList } from '@/lib/motion'

import type { PrepItem } from '../types'

import styles from './PrepView.module.css'

type PrepViewProps = {
  daysLeft: number
  items: PrepItem[]
  onTogglePrep: (item: PrepItem) => void
  onSeeTerm: () => void
}

// "Antes de empezar" (Escuela.dc.html): cuenta regresiva y la lista de
// preparación. "Estas casillas son las tareas del proyecto 'Ingeniería o
// maestría'" — por ahora solo datos propios de Escuela (decisión: apegarse
// al canvas, la conexión real con Proyectos llega en Fase 1b).
export function PrepView({
  daysLeft,
  items,
  onTogglePrep,
  onSeeTerm,
}: PrepViewProps) {
  return (
    <div className={styles.grid}>
      <Card tone="inverted" className={styles.hero}>
        <svg
          className={styles.heroArt}
          width="120"
          height="120"
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 15l17-9 17 9-17 9-17-9z" />
          <path d="M10 19v8c0 3 4.5 6 10 6s10-3 10-6v-8" />
        </svg>
        <span className={styles.heroLabel}>Faltan</span>
        <span className={styles.heroDays}>{daysLeft} días</span>
        <span className={styles.heroNote}>
          Para enero. Ingeniería o maestría: lo que llegue primero. Cuando
          sepas, eliges y armamos tu horario.
        </span>
        <div className={styles.heroActions}>
          <Button onClick={onSeeTerm}>Ver cómo se verá</Button>
          <Link href="/dia-a-dia/metas" className={styles.heroGoalLink}>
            Meta: Entrar a la ingeniería
          </Link>
        </div>
      </Card>

      <Card aria-labelledby="h-prep" className={styles.prepCard}>
        <h2 id="h-prep" className={styles.prepTitle}>
          Antes de empezar
        </h2>
        <motion.div
          variants={staggerList(0.04)}
          initial="hidden"
          animate="show"
        >
          {items.map((item) => (
            <motion.div
              key={item.id}
              variants={fadeUp}
              className={styles.prepRow}
            >
              <Checkbox
                checked={item.done}
                onToggle={() => onTogglePrep(item)}
                label={item.title}
              />
              <span
                className={item.done ? styles.prepTextDone : styles.prepText}
              >
                {item.title}
              </span>
              <span className={styles.prepNote}>{item.note}</span>
            </motion.div>
          ))}
        </motion.div>
        <span className={styles.prepHint}>
          Estas casillas son las tareas del proyecto{' '}
          <Link href="/proyectos" className={styles.prepHintLink}>
            &ldquo;Ingeniería o maestría&rdquo;
          </Link>
          .
        </span>
      </Card>
    </div>
  )
}
