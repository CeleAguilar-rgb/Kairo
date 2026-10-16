'use client'

import Link from 'next/link'

import { Card, CardHeader, CardLink, LineIcon } from '@/components/ui/Card'
import { CountUp } from '@/components/ui/Progress'

import { lateSummaryText } from '../routine-utils'
import { MEAL_LABEL, type MealPlan, type Streak } from '../types'

import { ProgressDial } from './ProgressDial'
import styles from './TodayCards.module.css'

type DayProgressCardProps = { done: number; total: number; pct: number; late: number }

// "Vas 4 de 6": el anillo de avance del día, con solo los bloques que cuentan para el reporte.
export function DayProgressCard({ done, total, pct, late }: DayProgressCardProps) {
  return (
    <Card as="section" className={styles.progress} aria-labelledby="today-progress">
      <ProgressDial value={total === 0 ? 0 : done / total}>
        <CountUp value={pct} format={(n) => `${Math.round(n)}%`} />
      </ProgressDial>
      <div className={styles.progressText}>
        <h2 id="today-progress" className={styles.progressTitle}>
          {total === 0 ? 'Sin bloques que cuenten' : `Vas ${done} de ${total}`}
        </h2>
        <span className={styles.hint}>{total === 0 ? 'Hoy no hay bloques para el reporte.' : lateSummaryText(late)}</span>
      </div>
    </Card>
  )
}

// "Menú de hoy" de Día a día: desayuno, comida y cena en filas (solo lectura; se marca desde Inicio).
export function TodayMenuCard({ meals }: { meals: MealPlan[] }) {
  return (
    <Card as="section" className={styles.side} aria-labelledby="today-menu">
      <CardHeader
        id="today-menu"
        title="Menú de hoy"
        iconTone="warm"
        icon={<LineIcon d={['M4 3v8a3 3 0 0 0 3 3v7M7 3v5M10 3v8a3 3 0 0 1-3 3', 'M17 21V3c-2 1-3 4-3 8h3']} />}
        action={<CardLink href="/dia-a-dia/menu">Semana</CardLink>}
      />
      {meals.length === 0 ? (
        <p className={styles.empty}>
          Sin menú para hoy. <Link href="/dia-a-dia/menu">Arma tu semana</Link>.
        </p>
      ) : (
        <ul className={styles.meals}>
          {meals.map((meal) => (
            <li key={meal.id} className={styles.meal}>
              <span className={styles.mealKind}>{MEAL_LABEL[meal.meal]}</span>
              <span className={styles.mealDish}>{meal.dish}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// "Rachas": los bloques con más días seguidos hechos y sus últimos 7 días.
export function StreaksCard({ streaks }: { streaks: Streak[] }) {
  return (
    <Card as="section" className={styles.side} aria-labelledby="today-streaks">
      <CardHeader
        id="today-streaks"
        title="Rachas"
        iconTone="accent"
        icon={<LineIcon d="M12 3c1 3 4 4.5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3 .5 1.5 1.5 2 2 2 0-3-1-5 1-8z" />}
        action={<CardLink href="/dia-a-dia/reporte">Reporte</CardLink>}
      />
      {streaks.length === 0 ? (
        <p className={styles.empty}>Todavía no hay rachas. Marca el mismo bloque varios días seguidos y aparece aquí.</p>
      ) : (
        <ul className={styles.streaks}>
          {streaks.map((streak) => (
            <li key={streak.blockId} className={styles.streak}>
              <span className={styles.streakName}>{streak.title}</span>
              <span className={styles.dots} aria-hidden="true">
                {streak.dots.map((on, index) => (
                  <span key={index} className={[styles.dot, on ? styles.dotOn : null].filter(Boolean).join(' ')} />
                ))}
              </span>
              <span className={styles.streakDays}>
                {streak.days} {streak.days === 1 ? 'día' : 'días'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
