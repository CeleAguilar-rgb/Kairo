'use client'

import Link from 'next/link'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { fadeUp, staggerList } from '@/lib/motion'

import { formatDayMonth } from '@/lib/dates'

import type { PrepItem, Term } from '../types'

import styles from './PrepView.module.css'

type PrepViewProps = {
  term: Term | null
  // Null si ya empezó el periodo o todavía no hay uno.
  daysLeft: number | null
  items: PrepItem[]
  goalLabel: string
  onTogglePrep: (item: PrepItem) => void
  onSeeTerm: () => void
  onDefineTerm: () => void
}

// El texto grande y la nota de la tarjeta oscura según en qué punto está el periodo.
function heroCopy(term: Term | null, daysLeft: number | null) {
  if (!term)
    return {
      label: 'Faltan',
      days: '— días',
      note: 'Define cuándo empieza tu periodo y aquí vas a ver la cuenta regresiva.',
    }
  if (daysLeft === null)
    return {
      label: 'Tu periodo',
      days: 'En curso',
      note: `${term.name}. Ya empezó: tus materias, entregas y calificaciones están en "Durante el semestre".`,
    }
  return {
    label: 'Faltan',
    days: `${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`,
    note: `Para el ${formatDayMonth(term.startsOn)}. ${term.name}. Cuando sepas, agrega tus materias y armamos tu horario.`,
  }
}

// "Antes de empezar" (Escuela.dc.html): cuenta regresiva y la lista de
// preparación. Las casillas son las tareas del proyecto de preparación del
// periodo (decisión #43): marcarlas aquí las marca en Tareas y en Proyectos.
export function PrepView({
  term,
  daysLeft,
  items,
  goalLabel,
  onTogglePrep,
  onSeeTerm,
  onDefineTerm,
}: PrepViewProps) {
  const copy = heroCopy(term, daysLeft)
  const prepProject = term?.prepProject ?? null

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
        <span className={styles.heroLabel}>{copy.label}</span>
        <span className={styles.heroDays}>{copy.days}</span>
        <span className={styles.heroNote}>{copy.note}</span>
        <div className={styles.heroActions}>
          {term ? (
            <Button onClick={onSeeTerm}>Ver cómo se verá</Button>
          ) : (
            <Button onClick={onDefineTerm}>Definir periodo</Button>
          )}
          <Link href="/dia-a-dia/metas" className={styles.heroGoalLink}>
            {goalLabel}
          </Link>
        </div>
      </Card>

      <Card aria-labelledby="h-prep" className={styles.prepCard}>
        <h2 id="h-prep" className={styles.prepTitle}>
          Antes de empezar
        </h2>
        {items.length > 0 ? (
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
        ) : (
          <span className={styles.prepHint}>
            {prepProject
              ? 'Ese proyecto todavía no tiene tareas. Agrégalas ahí y van a aparecer aquí.'
              : 'Elige en "Periodo" el proyecto cuyas tareas son tu lista de preparación.'}
          </span>
        )}
        {prepProject ? (
          <span className={styles.prepHint}>
            Estas casillas son las tareas del proyecto{' '}
            <Link
              href={`/proyectos/${prepProject.id}`}
              className={styles.prepHintLink}
            >
              &ldquo;{prepProject.name}&rdquo;
            </Link>
            .
          </span>
        ) : null}
      </Card>
    </div>
  )
}
