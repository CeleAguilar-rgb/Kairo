'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/Button'
import { Card, LineIcon } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { addDays, dayOfMonth, formatRange, formatWallTime, WEEKDAYS_SHORT, weekdayOf, type IsoDate } from '@/lib/dates'
import { DURATION, EASE_OUT } from '@/lib/motion'

import { clearWeekAction, copyWeekAction } from '../meal-actions'
import { MEAL_ORDER, filledCount, mealKey, mealWeekSummary, weekLabel } from '../meal-utils'
import { undoRoutineAction } from '../routine-actions'
import { weekDates } from '../routine-utils'
import { MEAL_LABEL, type Meal, type MealPlan } from '../types'

import { MealEditor } from './MealEditor'
import styles from './MenuWeek.module.css'

type MenuWeekProps = {
  weekStart: IsoDate
  today: IsoDate
  plans: MealPlan[]
  slots: Record<Meal, { time: string; blockTitle: string }>
  // La semana anterior, para "Copiar 5 – 11 oct" (solo si tiene menú).
  previous: { start: IsoDate; hasMenu: boolean }
  hourFormat: '12h' | '24h'
}

type Selection = { date: IsoDate; meal: Meal }

// El menú de una semana (MenuSemanal.dc.html): 7 días × desayuno, comida y cena, y al lado el panel del
// platillo elegido. Sin menú, la semana se ofrece copiar de la anterior o empezar en blanco.
export function MenuWeek({ weekStart, today, plans, slots, previous, hourFormat }: MenuWeekProps) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Selection | null>(null)
  const [blank, setBlank] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const dates = weekDates(weekStart)
  const byKey = new Map(plans.map((plan) => [mealKey(plan.planDate, plan.meal), plan]))
  const filled = filledCount(plans)
  const hasMenu = filled > 0 || blank

  const selectedPlan = selected ? (byKey.get(mealKey(selected.date, selected.meal)) ?? null) : null

  function pick(next: Selection) {
    setSelected(next)
    setConfirmClear(false)
  }

  function handleCopy() {
    startTransition(async () => {
      const result = await copyWeekAction({ from: previous.start, to: weekStart })
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo copiar el menú.', icon: 'info' })
      toast.show({ message: `Menú copiado de ${weekLabel(previous.start)}.`, icon: 'check' })
    })
  }

  function handleClear() {
    startTransition(async () => {
      const result = await clearWeekAction({ week: weekStart })
      if (!result.ok) return toast.show({ message: result.message ?? 'No se pudo vaciar la semana.', icon: 'info' })
      setConfirmClear(false)
      setSelected(null)
      setBlank(false)
      const token = result.undoToken
      toast.show({
        message: `Semana vaciada (${filled} ${filled === 1 ? 'platillo' : 'platillos'}).`,
        icon: 'trash',
        onUndo: token ? () => void undoRoutineAction(token) : undefined,
      })
    })
  }

  return (
    <div className={styles.grid}>
      <Card as="section" className={styles.board} aria-label="Menú de la semana">
        {hasMenu ? (
          <>
            <div className={styles.scroller}>
              <div className={styles.matrix}>
                <span />
                {dates.map((date) => (
                  <div key={date} className={[styles.dayHead, date === today ? styles.dayToday : null].filter(Boolean).join(' ')}>
                    <span className={styles.dow}>{WEEKDAYS_SHORT[weekdayOf(date)]}</span>
                    <span className={styles.dayNum}>{dayOfMonth(date)}</span>
                  </div>
                ))}

                {MEAL_ORDER.map((meal) => (
                  <MealRow
                    key={meal}
                    meal={meal}
                    time={slots[meal].time}
                    dates={dates}
                    today={today}
                    byKey={byKey}
                    selected={selected}
                    hourFormat={hourFormat}
                    onPick={pick}
                  />
                ))}
              </div>
            </div>

            <div className={styles.foot}>
              <span>{mealWeekSummary(plans)}</span>
              <button type="button" className={styles.clear} onClick={() => setConfirmClear(true)} disabled={filled === 0}>
                Vaciar semana
              </button>
            </div>

            <AnimatePresence initial={false}>
              {confirmClear ? (
                <motion.div
                  key="confirm"
                  role="alertdialog"
                  aria-labelledby="clear-week-title"
                  className={styles.confirm}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto', transition: { duration: 0.3, ease: EASE_OUT } }}
                  exit={{ opacity: 0, height: 0, transition: { duration: DURATION.base } }}
                >
                  <div className={styles.confirmInner}>
                    <span id="clear-week-title" className={styles.confirmText}>
                      ¿Vaciar los {filled} {filled === 1 ? 'platillo' : 'platillos'} de esta semana? Van a la papelera.
                    </span>
                    <Button variant="ghost" className={styles.confirmCancel} onClick={() => setConfirmClear(false)}>
                      Cancelar
                    </Button>
                    <Button variant="danger" className={styles.confirmDo} onClick={handleClear} disabled={pending}>
                      Vaciar {filled} {filled === 1 ? 'platillo' : 'platillos'}
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        ) : (
          <div className={styles.empty}>
            <svg width="84" height="72" viewBox="0 0 84 72" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 38h60c0 14-12 24-30 24S12 52 12 38z" fill="var(--accent-warm)" />
              <path d="M30 28c0-6 6-6 6-12M42 28c0-6 6-6 6-12M54 28c0-4 4-5 4-9" />
              <path d="M8 62h68" />
            </svg>
            <span className={styles.emptyTitle}>Semana sin menú</span>
            <span className={styles.emptyText}>
              Del {formatRange(weekStart, addDays(weekStart, 6))} todavía no hay nada.{' '}
              {previous.hasMenu ? 'Copia la semana pasada y cambia lo que quieras, o empieza en blanco.' : 'Empieza en blanco y arma tus comidas.'}
            </span>
            <div className={styles.emptyActions}>
              {previous.hasMenu ? <Button onClick={handleCopy} disabled={pending}>Copiar {weekLabel(previous.start)}</Button> : null}
              <Button
                variant={previous.hasMenu ? 'ghost' : 'solid'}
                onClick={() => {
                  setBlank(true)
                  setSelected({ date: dates[0], meal: 'breakfast' })
                }}
              >
                Empezar en blanco
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card as="section" className={styles.panel} aria-label="Platillo">
        <AnimatePresence mode="wait" initial={false}>
          {hasMenu && selected ? (
            <motion.div
              key={mealKey(selected.date, selected.meal)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: DURATION.fast } }}
            >
              <MealEditor date={selected.date} meal={selected.meal} plan={selectedPlan} slot={slots[selected.meal]} hourFormat={hourFormat} />
            </motion.div>
          ) : (
            <motion.div key="none" className={styles.noSelection} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className={styles.noSelectionTitle}>Elige un espacio</h2>
              <span className={styles.hint}>Pica un día y una comida para escribir el platillo.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}

type MealRowProps = {
  meal: Meal
  time: string
  dates: IsoDate[]
  today: IsoDate
  byKey: Map<string, MealPlan>
  selected: Selection | null
  hourFormat: '12h' | '24h'
  onPick: (selection: Selection) => void
}

function MealRow({ meal, time, dates, today, byKey, selected, hourFormat, onPick }: MealRowProps) {
  return (
    <>
      <div className={styles.rowHead}>
        <span className={styles.rowName}>{MEAL_LABEL[meal]}</span>
        <span className={styles.rowTime}>{formatWallTime(time, hourFormat)}</span>
      </div>
      {dates.map((date) => {
        const plan = byKey.get(mealKey(date, meal))
        const on = selected?.date === date && selected.meal === meal
        const past = date < today
        const classes = [styles.slot, !plan ? styles.slotEmpty : date === today ? styles.slotToday : null, past && plan ? styles.slotPast : null, on ? styles.slotOn : null]
        return (
          <button
            key={date}
            type="button"
            className={classes.filter(Boolean).join(' ')}
            aria-pressed={on}
            aria-label={`${WEEKDAYS_SHORT[weekdayOf(date)]} ${dayOfMonth(date)}, ${MEAL_LABEL[meal]}: ${plan?.dish ?? 'vacío'}`}
            onClick={() => onPick({ date, meal })}
          >
            {plan ? (
              <>
                <span className={styles.dish}>{plan.dish}</span>
                {plan.prep ? <span className={[styles.tag, styles.tagPrep].join(' ')}>Meal prep</span> : null}
                {plan.hasEvent ? <span className={[styles.tag, styles.tagEvent].join(' ')}>Evento</span> : null}
                {plan.done ? (
                  <span className={styles.ate}>
                    <LineIcon d="M5 12l5 5L20 7" size={12} strokeWidth={3} />
                    Comido
                  </span>
                ) : null}
              </>
            ) : (
              <span className={styles.add}>
                <LineIcon d="M12 5v14M5 12h14" size={14} strokeWidth={2.2} />
                Agregar
              </span>
            )}
          </button>
        )
      })}
    </>
  )
}

