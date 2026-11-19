'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/Button'
import { Card, LineIcon } from '@/components/ui/Card'
import { ScrollFade } from '@/components/ui/ScrollFade'
import { useToast } from '@/components/ui/Toast'
import { addDays, dayOfMonth, formatLongDay, formatRange, formatWallTime, WEEKDAYS_SHORT, weekdayOf, type IsoDate } from '@/lib/dates'
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
//
// En el teléfono (≤720px) una semana de 7 columnas no cabe, así que por defecto se ve un día a la vez, empezando
// por hoy: una fila de los 7 días para saltar de uno a otro y las tres comidas del día con todo el ancho. Un
// botón de íconos cambia a la semana completa (la matriz que se desliza). Las dos vistas están siempre en el
// HTML y el CSS muestra la que toca (`data-view` y la media query): así no hay que saber el ancho de la pantalla
// desde JavaScript ni se descuadra al hidratar. Arriba de 720px solo se ve la matriz.
export function MenuWeek({ weekStart, today, plans, slots, previous, hourFormat }: MenuWeekProps) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Selection | null>(null)
  const [blank, setBlank] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [view, setView] = useState<'day' | 'week'>('day')

  const dates = weekDates(weekStart)
  // Hoy si cae en esta semana; si no (la semana que viene), el primer día.
  const [activeDate, setActiveDate] = useState<IsoDate>(() => (dates.includes(today) ? today : dates[0]))
  const byKey = new Map(plans.map((plan) => [mealKey(plan.planDate, plan.meal), plan]))
  const filled = filledCount(plans)
  const hasMenu = filled > 0 || blank

  const selectedPlan = selected ? (byKey.get(mealKey(selected.date, selected.meal)) ?? null) : null

  function pick(next: Selection) {
    setSelected(next)
    setConfirmClear(false)
    // En el teléfono el editor del platillo queda debajo del menú: se baja hasta él para que se vea que se abrió.
    if (window.matchMedia('(max-width: 720px)').matches) {
      document.getElementById('menu-meal-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
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
      <Card as="section" className={styles.board} aria-label="Menú de la semana" data-view={view}>
        {hasMenu ? (
          <>
            {/* Solo teléfono: el día que se está viendo y el botón que cambia entre un día y la semana. */}
            <div className={styles.dayBar}>
              <h2 className={styles.dayTitle}>{view === 'day' ? formatLongDay(activeDate) : 'Toda la semana'}</h2>
              <button
                type="button"
                className={styles.viewToggle}
                aria-label={view === 'day' ? 'Ver toda la semana' : 'Ver un día a la vez'}
                title={view === 'day' ? 'Semana' : 'Por día'}
                onClick={() => setView(view === 'day' ? 'week' : 'day')}
              >
                {/* Muestra la vista a la que se cambia: la cuadrícula para ir a la semana, la lista para volver al día. */}
                <LineIcon
                  d={view === 'day' ? ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'] : ['M8 6h13M8 12h13M8 18h13', 'M3 6h.01M3 12h.01M3 18h.01']}
                  size={20}
                />
              </button>
            </div>

            <DayView
              dates={dates}
              today={today}
              active={activeDate}
              onActive={setActiveDate}
              byKey={byKey}
              selected={selected}
              slots={slots}
              hourFormat={hourFormat}
              onPick={pick}
            />

            <ScrollFade className={styles.scroller}>
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
            </ScrollFade>

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

      <Card as="section" id="menu-meal-panel" className={styles.panel} aria-label="Platillo">
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

// Las clases de una celda según lo que tiene: vacía (con raya), hoy, ya pasó, o la elegida.
function slotClass(plan: MealPlan | undefined, date: IsoDate, today: IsoDate, on: boolean) {
  return [styles.slot, !plan ? styles.slotEmpty : date === today ? styles.slotToday : null, date < today && plan ? styles.slotPast : null, on ? styles.slotOn : null]
    .filter(Boolean)
    .join(' ')
}

function slotLabel(date: IsoDate, meal: Meal, plan: MealPlan | undefined) {
  return `${WEEKDAYS_SHORT[weekdayOf(date)]} ${dayOfMonth(date)}, ${MEAL_LABEL[meal]}: ${plan?.dish ?? 'vacío'}${plan?.prep ? ' · meal prep' : ''}`
}

// Lo de adentro de una celda: el platillo y sus marcas, o "Agregar". Igual en la matriz y en la vista de un día.
function SlotBody({ plan }: { plan: MealPlan | undefined }) {
  if (!plan) {
    return (
      <span className={styles.add}>
        <LineIcon d="M12 5v14M5 12h14" size={14} strokeWidth={2.2} />
        Agregar
      </span>
    )
  }
  return (
    <>
      <span className={styles.dish}>{plan.dish}</span>
      {/* Meal prep casi siempre se repite toda la semana (el resumen de arriba ya lo dice): en cada
          celda basta un ícono pequeño, y el texto queda en el aria-label del botón y en el title. */}
      {plan.prep ? (
        <span className={styles.prepIcon} title="Meal prep" aria-hidden="true">
          <LineIcon d={['M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z', 'M8 10V7a4 4 0 0 1 8 0v3']} size={12} strokeWidth={2} />
        </span>
      ) : null}
      {plan.hasEvent ? <span className={[styles.tag, styles.tagEvent].join(' ')}>Evento</span> : null}
      {plan.done ? (
        <span className={styles.ate}>
          <LineIcon d="M5 12l5 5L20 7" size={12} strokeWidth={3} />
          Comido
        </span>
      ) : null}
    </>
  )
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
        return (
          <button key={date} type="button" className={slotClass(plan, date, today, on)} aria-pressed={on} aria-label={slotLabel(date, meal, plan)} onClick={() => onPick({ date, meal })}>
            <SlotBody plan={plan} />
          </button>
        )
      })}
    </>
  )
}

type DayViewProps = {
  dates: IsoDate[]
  today: IsoDate
  active: IsoDate
  onActive: (date: IsoDate) => void
  byKey: Map<string, MealPlan>
  selected: Selection | null
  slots: Record<Meal, { time: string; blockTitle: string }>
  hourFormat: '12h' | '24h'
  onPick: (selection: Selection) => void
}

// La vista de teléfono: los 7 días como botones chicos (el elegido va oscuro, hoy lleva lavanda suave) y debajo
// las tres comidas del día elegido, cada una con todo el ancho para que el platillo no se corte.
function DayView({ dates, today, active, onActive, byKey, selected, slots, hourFormat, onPick }: DayViewProps) {
  // Los 7 días no caben con holgura en una pantalla angosta: se deslizan de lado y el elegido se lleva al centro.
  const wrapRef = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  useEffect(() => {
    const scroller = wrapRef.current?.firstElementChild as HTMLElement | null
    const chip = scroller?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!scroller || !chip) return
    const left = chip.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft
    scroller.scrollTo({ left: left - (scroller.clientWidth - chip.offsetWidth) / 2, behavior: first.current ? 'auto' : 'smooth' })
    first.current = false
  }, [active])

  return (
    <div className={styles.dayView}>
      <div ref={wrapRef}>
        <ScrollFade className={styles.chipsScroll}>
          <div className={styles.chips} role="group" aria-label="Día de la semana">
            {dates.map((date) => (
          <button
            key={date}
            type="button"
            className={[styles.chip, date === today ? styles.chipToday : null, date === active ? styles.chipOn : null].filter(Boolean).join(' ')}
            aria-pressed={date === active}
            aria-label={formatLongDay(date)}
            onClick={() => onActive(date)}
          >
            <span className={styles.dow}>{WEEKDAYS_SHORT[weekdayOf(date)]}</span>
            <span className={styles.dayNum}>{dayOfMonth(date)}</span>
          </button>
            ))}
          </div>
        </ScrollFade>
      </div>

      <div className={styles.dayMeals}>
        {MEAL_ORDER.map((meal) => {
          const plan = byKey.get(mealKey(active, meal))
          const on = selected?.date === active && selected.meal === meal
          return (
            <button
              key={meal}
              type="button"
              className={[slotClass(plan, active, today, on), styles.daySlot].join(' ')}
              aria-pressed={on}
              aria-label={slotLabel(active, meal, plan)}
              onClick={() => onPick({ date: active, meal })}
            >
              <span className={styles.daySlotHead}>
                <span>{MEAL_LABEL[meal]}</span>
                <span>{formatWallTime(slots[meal].time, hourFormat)}</span>
              </span>
              <SlotBody plan={plan} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
