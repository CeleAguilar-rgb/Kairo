'use client'

import { motion } from 'motion/react'

import { EASE_OUT } from '@/lib/motion'

import type { WeekDay } from '../types'
import { formatCount } from '../writing-utils'

import styles from './WeekWords.module.css'

// Con 900 palabras en un día la barra llega a su altura máxima (40 px), como en el canvas.
const FULL_BAR_WORDS = 900
const BAR_MAX_PX = 40

// Las palabras de esta semana contra la meta del día (EscritosInicio): el total, y siete barras de lunes a domingo.
// La barra del día que más escribiste va oscura, las demás lavanda y los días sin palabras quedan tenues.
export function WeekWords({ week, total, dailyGoal }: { week: WeekDay[]; total: number; dailyGoal: number }) {
  const best = Math.max(...week.map((day) => day.words))
  const spoken = week
    .map((day) => (day.isFuture ? null : `${day.label}: ${day.words > 0 ? `${formatCount(day.words)} palabras` : 'sin escribir'}`))
    .filter(Boolean)
    .join(', ')

  return (
    <div className={styles.card}>
      <div className={styles.numbers}>
        <span className={styles.total}>{formatCount(total)}</span>
        <span className={styles.hint}>palabras esta semana · meta {formatCount(dailyGoal)} al día</span>
      </div>
      <div className={styles.bars} role="img" aria-label={`Palabras por día. ${spoken}`}>
        {week.map((day, index) => {
          const height = Math.max(4, Math.round((day.words / FULL_BAR_WORDS) * BAR_MAX_PX))
          const tone = day.words === 0 ? styles.empty : day.words === best ? styles.best : styles.some
          return (
            <div key={day.date} className={styles.day}>
              <motion.span
                className={[styles.bar, tone].join(' ')}
                style={{ height, originY: 1 }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, ease: EASE_OUT, delay: index * 0.06 }}
              />
              <span className={[styles.label, day.isToday ? styles.today : null].filter(Boolean).join(' ')}>{day.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
