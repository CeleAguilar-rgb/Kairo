'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useOptimistic, useTransition } from 'react'

import { Card, CardHeader, CardLink, LineIcon } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { DURATION, fadeUp, SPRING, staggerList } from '@/lib/motion'

import { toggleMealDoneAction } from '../meal-actions'
import { MEAL_LABEL, type MealPlan } from '../types'

import styles from './DailyCards.module.css'

// "Menú de hoy" (Main.dc.html). Picar una comida la marca como comida (meal_plans.done) con una acción de
// servidor; la fila reacciona al instante y, cuando la acción termina, la lista real la reemplaza.
export function MenuCard({ meals: initial }: { meals: MealPlan[] }) {
  const toast = useToast()
  const [, startTransition] = useTransition()
  const [meals, flip] = useOptimistic(initial, (current, id: string) => current.map((m) => (m.id === id ? { ...m, done: !m.done } : m)))

  function toggle(meal: MealPlan) {
    startTransition(async () => {
      flip(meal.id)
      const result = await toggleMealDoneAction({ date: meal.planDate, meal: meal.meal })
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo marcar la comida.', icon: 'info' })
    })
  }

  return (
    <Card as="section" className={styles.card} aria-labelledby="home-menu">
      <CardHeader
        id="home-menu"
        title="Menú de hoy"
        iconTone="warm"
        icon={<LineIcon d={['M4 3v8a3 3 0 0 0 3 3v7M7 3v5M10 3v8a3 3 0 0 1-3 3', 'M17 21V3c-2 1-3 4-3 8h3']} />}
        action={<CardLink href="/dia-a-dia/menu">Semana</CardLink>}
      />
      {meals.length === 0 ? (
        <p className={styles.emptyText}>Sin menú para hoy. Arma tu semana en Día a día.</p>
      ) : (
        <motion.ul className={styles.meals} variants={staggerList(0.06, 0.1)} initial="hidden" animate="show">
          {meals.map((meal) => (
            <motion.li key={meal.id} variants={fadeUp}>
              <motion.button
                type="button"
                className={[styles.meal, meal.done ? styles.mealDone : null].filter(Boolean).join(' ')}
                aria-pressed={meal.done}
                aria-label={`${MEAL_LABEL[meal.meal]}: ${meal.dish}${meal.done ? ', comido' : ''}`}
                onClick={() => toggle(meal)}
                whileTap={{ scale: 0.98 }}
              >
                <span className={styles.mealKind}>{MEAL_LABEL[meal.meal]}</span>
                <span className={styles.mealDish}>{meal.dish}</span>
                <AnimatePresence initial={false}>
                  {meal.done ? (
                    <motion.svg
                      key="check"
                      className={styles.mealCheck}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0, transition: SPRING.pop }}
                      exit={{ scale: 0, opacity: 0, transition: { duration: DURATION.fast } }}
                    >
                      <path d="M5 12l5 5L20 7" />
                    </motion.svg>
                  ) : null}
                </AnimatePresence>
              </motion.button>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </Card>
  )
}
