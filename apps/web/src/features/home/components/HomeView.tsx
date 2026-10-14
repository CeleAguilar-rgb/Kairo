'use client'

import type { ModuleId } from '@kairo/shared'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import Link from 'next/link'
import { memo, useState, type ReactNode } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { WeekCard, type AgendaEvent } from '@/features/agenda'
import {
  GoalsCard,
  MenuCard,
  RoutineNowCard,
  type Goal,
  type MealPlan,
  type RoutineBlockToday,
} from '@/features/daily'
import { PaymentsCard, type Membership } from '@/features/finance'
import { ProjectsCard, type Project } from '@/features/projects'
import { RemindersCard, type Reminder } from '@/features/reminders'
import { TodayTasksCard, type Task } from '@/features/tasks'
import type { IsoDate } from '@/lib/dates'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'

import { HOME_CARDS, type HomeCardId } from '../cards'

import { Greeting } from './Greeting'
import styles from './HomeView.module.css'

// Marcar un pendiente cambia el contador del saludo, y eso vuelve a renderizar
// HomeView completo. Cada tarjeta recibe los mismos datos de antes, así que con
// memo React se salta las otras siete en vez de repintarlas.
const Cards = {
  tasks: memo(TodayTasksCard),
  agenda: memo(WeekCard),
  routine: memo(RoutineNowCard),
  goals: memo(GoalsCard),
  menu: memo(MenuCard),
  payments: memo(PaymentsCard),
  projects: memo(ProjectsCard),
  reminders: memo(RemindersCard),
}

export type HomeData = {
  tasks: Task[] | null
  events: AgendaEvent[] | null
  routine: RoutineBlockToday[] | null
  goals: Goal[] | null
  meals: MealPlan[] | null
  payments: Membership[] | null
  projects: Project[] | null
  reminders: Reminder[] | null
}

type HomeViewProps = {
  data: HomeData
  enabledModules: ModuleId[]
  name: string
  hello: string
  dateText: string
  today: IsoDate
  weekEnd: IsoDate
  nowMinutes: number
  timeZone: string
  hourFormat: '12h' | '24h'
  weekStart: 'monday' | 'sunday'
  currency: string
}

export function HomeView(props: HomeViewProps) {
  const { data, enabledModules, today, weekEnd } = props
  const available = HOME_CARDS.filter(
    (card) =>
      card.module === 'reminders' || enabledModules.includes(card.module),
  )
  // Tarjetas apagadas en "Ajustar mi Inicio" (home_cards.enabled = false). En
  // memoria hasta que exista PUT /v1/me/home-cards.
  const [hidden, setHidden] = useState<Set<HomeCardId>>(new Set())
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(
    () => (data.tasks ?? []).filter((t) => t.status !== 'done').length,
  )

  const visible = available.filter((card) => !hidden.has(card.id))
  // layoutDependency: Motion solo mide el layout cuando este valor cambia. Sin él mide
  // en CADA render (por ejemplo, con cada tecla que se escribe), y medir fuerza al
  // navegador a recalcular la página.
  const layoutKey = `${visible.map((card) => card.id).join(',')}|${adjustOpen}`

  const paymentsThisWeek = (data.payments ?? []).filter(
    (p) => p.nextChargeOn >= today && p.nextChargeOn <= weekEnd,
  )
  const dueThisWeekCents = paymentsThisWeek.reduce(
    (sum, p) => sum + p.amountCents,
    0,
  )

  function toggleCard(id: HomeCardId) {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderCard(id: HomeCardId): ReactNode {
    switch (id) {
      case 'tasks':
        return data.tasks ? (
          <Cards.tasks
            tasks={data.tasks}
            today={today}
            onDoneCountChange={setPendingCount}
          />
        ) : null
      case 'agenda':
        return data.events ? (
          <Cards.agenda
            events={data.events}
            today={today}
            timeZone={props.timeZone}
            hourFormat={props.hourFormat}
            weekStart={props.weekStart}
          />
        ) : null
      case 'routine':
        return data.routine ? (
          <Cards.routine
            blocks={data.routine}
            nowMinutes={props.nowMinutes}
            hourFormat={props.hourFormat}
          />
        ) : null
      case 'goals':
        return data.goals ? <Cards.goals goals={data.goals} /> : null
      case 'menu':
        return data.meals ? <Cards.menu meals={data.meals} /> : null
      case 'payments':
        return data.payments ? (
          <Cards.payments payments={data.payments} today={today} />
        ) : null
      case 'projects':
        return data.projects ? (
          <Cards.projects projects={data.projects} />
        ) : null
      case 'reminders':
        return data.reminders ? (
          <Cards.reminders
            reminders={data.reminders}
            today={today}
            timeZone={props.timeZone}
            hourFormat={props.hourFormat}
          />
        ) : null
    }
  }

  return (
    <main className={styles.main}>
      <Greeting
        hello={props.hello}
        subtitle={buildSubtitle(
          props.dateText,
          props.name,
          pendingCount,
          enabledModules.includes('finance') ? paymentsThisWeek.length : null,
        )}
        pendingCount={pendingCount}
        activeProjects={data.projects ? data.projects.length : null}
        dueThisWeekCents={data.payments ? dueThisWeekCents : null}
        currency={props.currency}
      />

      <LayoutGroup>
        <motion.div className={styles.grid} layout layoutDependency={layoutKey}>
          <AnimatePresence mode="popLayout">
            {visible.map((card, index) => (
              <motion.div
                key={card.id}
                layout
                layoutDependency={layoutKey}
                className={[styles.cell, styles[`span${card.span}`]].join(' ')}
                // La primera vez entran escalonadas; al prender/apagar una en
                // "Ajustar", solo esa aparece o se va y las demás se reacomodan.
                // Se asientan 6px y aparecen: sin subir desde lejos, porque el esqueleto de carga ya
                // ocupa este mismo lugar y un desplazamiento grande se vería como un salto.
                initial={{ opacity: 0, y: 6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.4,
                    ease: EASE_OUT,
                    delay: index * 0.04,
                  },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.94,
                  transition: { duration: DURATION.base, ease: EASE_OUT },
                }}
                transition={SPRING.panel}
              >
                {renderCard(card.id) ?? <SectionError name={card.name} />}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {visible.length === 0 ? (
          <motion.p
            className={styles.allHidden}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Apagaste todas las tarjetas. Prende alguna en &quot;Ajustar mi
            Inicio&quot;.
          </motion.p>
        ) : null}

        <motion.div
          layout
          layoutDependency={layoutKey}
          className={styles.adjustRow}
        >
          <motion.button
            type="button"
            className={styles.adjustButton}
            aria-expanded={adjustOpen}
            aria-controls="home-adjust"
            onClick={() => setAdjustOpen((open) => !open)}
            whileTap={{ scale: 0.97 }}
          >
            <motion.span
              className={styles.adjustIcon}
              animate={{ rotate: adjustOpen ? 180 : 0 }}
              transition={SPRING.pop}
            >
              <LineIcon
                d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4"
                size={16}
              />
            </motion.span>
            Ajustar mi Inicio
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {adjustOpen ? (
            <motion.section
              id="home-adjust"
              layout
              layoutDependency={layoutKey}
              className={styles.adjust}
              aria-label="Tarjetas del Inicio"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: SPRING.panel }}
              exit={{
                opacity: 0,
                y: -8,
                transition: { duration: DURATION.fast },
              }}
            >
              <div className={styles.adjustHead}>
                <h2 className={styles.adjustTitle}>
                  ¿Qué quieres ver en tu Inicio?
                </h2>
                <span className={styles.adjustHint}>
                  Solo salen tarjetas de las secciones que tienes prendidas en
                  tu perfil.
                </span>
              </div>
              <div className={styles.chips}>
                {available.map((card) => {
                  const on = !hidden.has(card.id)
                  return (
                    <motion.button
                      key={card.id}
                      type="button"
                      className={[styles.chip, on ? styles.chipOn : null]
                        .filter(Boolean)
                        .join(' ')}
                      aria-pressed={on}
                      onClick={() => toggleCard(card.id)}
                      whileTap={{ scale: 0.94 }}
                    >
                      {/* Palomita (prendida) o + (apagada) en el mismo lugar: se cruzan
                          girando, sin cambiar el ancho del chip. */}
                      <span className={styles.chipIcon}>
                        <AnimatePresence initial={false} mode="wait">
                          <motion.span
                            key={on ? 'on' : 'off'}
                            className={styles.chipIconInner}
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{
                              scale: 1,
                              rotate: 0,
                              transition: SPRING.pop,
                            }}
                            exit={{
                              scale: 0,
                              rotate: 90,
                              transition: { duration: DURATION.fast },
                            }}
                          >
                            <LineIcon
                              d={on ? 'M5 12l5 5L20 7' : 'M12 5v14M5 12h14'}
                              size={14}
                              strokeWidth={2.6}
                            />
                          </motion.span>
                        </AnimatePresence>
                      </span>
                      {card.name}
                    </motion.button>
                  )
                })}
              </div>
              <Link href="/perfil" className={styles.adjustLink}>
                Cambiar mis secciones
              </Link>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </LayoutGroup>
    </main>
  )
}

// "Jueves 8 de octubre, Celeste. Tienes 4 pendientes y un pago esta semana."
function buildSubtitle(
  dateText: string,
  name: string,
  pending: number,
  payments: number | null,
) {
  const pendingText =
    pending === 0
      ? 'no tienes pendientes'
      : pending === 1
        ? 'tienes 1 pendiente'
        : `tienes ${pending} pendientes`
  const lead = `${dateText}, ${name}.`
  const sentence = pendingText.charAt(0).toUpperCase() + pendingText.slice(1)
  if (payments === null) return `${lead} ${sentence}.`
  const paymentsText =
    payments === 0
      ? 'ningún pago'
      : payments === 1
        ? 'un pago'
        : `${payments} pagos`
  return `${lead} ${sentence} y ${paymentsText} esta semana.`
}

// Si falla una sección, solo cae su tarjeta (docs/guides/design.md, Errores).
function SectionError({ name }: { name: string }) {
  return (
    <div className={styles.cardError} role="status">
      <span className={styles.cardErrorTitle}>{name}</span>
      <span>No pudimos cargar esta tarjeta. Lo demás sigue funcionando.</span>
      <button
        type="button"
        className={styles.retry}
        onClick={() => window.location.reload()}
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
