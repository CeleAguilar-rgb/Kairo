'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Segmented } from '@/components/ui/Segmented'
import type { IsoDate } from '@/lib/dates'
import { DURATION } from '@/lib/motion'
import { useEntering } from '@/lib/use-entering'

import type { Goal, GoalStatus } from '../types'

import { DailyToolbar } from './DailyToolbar'
import { AchievedGoalCard, GoalCard } from './GoalCard'
import { GoalCelebration } from './GoalCelebration'
import { GoalDetailDrawer } from './GoalDetailDrawer'
import { GoalFormDrawer } from './GoalFormDrawer'
import styles from './GoalsView.module.css'

type Option = { value: string; label: string }

type GoalsViewProps = {
  goals: Goal[]
  today: IsoDate
  habitBlocks: Option[]
  projects: Option[]
}

type Panel = { type: 'detail'; id: string } | { type: 'form'; id: string | null } | null

const FILTERS: { value: GoalStatus; label: string }[] = [
  { value: 'active', label: 'Activas' },
  { value: 'done', label: 'Logradas' },
  { value: 'paused', label: 'En pausa' },
]

// Metas (Metas.dc.html): las tarjetas por estado (activas, logradas, en pausa), el detalle de cada una en un
// panel, el formulario de nueva meta y la celebración al lograr una.
export function GoalsView({ goals, today, habitBlocks, projects }: GoalsViewProps) {
  const entering = useEntering()
  const [filter, setFilter] = useState<GoalStatus>('active')
  const [panel, setPanel] = useState<Panel>(null)
  const [celebrating, setCelebrating] = useState<string | null>(null)

  const countOf = (status: GoalStatus) => goals.filter((goal) => goal.status === status).length
  const shown = goals.filter((goal) => goal.status === filter)
  const byId = (id: string | null) => goals.find((goal) => goal.id === id) ?? null

  const detailGoal = panel?.type === 'detail' ? byId(panel.id) : null
  const formOpen = panel?.type === 'form'
  const formGoal = panel?.type === 'form' ? byId(panel.id) : null

  const newGoal = () => setPanel({ type: 'form', id: null })

  return (
    <>
      <DailyToolbar
        action={
          <Button onClick={newGoal}>
            <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
            Nueva meta
          </Button>
        }
      >
        Tus metas
      </DailyToolbar>

      <Segmented
        label="Estado de las metas"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((item) => ({
          value: item.value,
          label: (
            <>
              {item.label}
              <span className={styles.count}>{countOf(item.value)}</span>
            </>
          ),
        }))}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: DURATION.fast } }} transition={{ duration: 0.25 }}>
          {shown.length === 0 ? (
            <EmptyState
              id="goals-empty"
              title={filter === 'active' ? 'Aún no tienes metas activas' : filter === 'done' ? 'Tu vitrina está vacía' : 'Nada en pausa'}
              description={
                filter === 'active'
                  ? 'Una meta puede ser un logro con hitos, una cantidad, un hábito de tu rutina o un proyecto.'
                  : filter === 'done'
                    ? 'Cuando logres una meta se queda aquí, con su estrella.'
                    : 'Cuando pauses una meta aparecerá aquí, con su avance guardado para retomarla después.'
              }
              doodle={filter === 'done' ? 'star' : filter === 'paused' ? 'cloud' : 'sun'}
              actions={filter === 'active' ? <Button onClick={newGoal}>Nueva meta</Button> : undefined}
            />
          ) : (
            <div className={styles.goals}>
              {shown.map((goal, index) =>
                goal.status === 'done' ? (
                  <AchievedGoalCard key={goal.id} goal={goal} delay={entering ? 0.1 + index * 0.06 : 0} />
                ) : (
                  <GoalCard key={goal.id} goal={goal} today={today} delay={entering ? 0.1 + index * 0.06 : 0} onOpen={(item) => setPanel({ type: 'detail', id: item.id })} />
                ),
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <GoalDetailDrawer
        goal={detailGoal}
        today={today}
        onClose={() => setPanel(null)}
        onEdit={(goal) => setPanel({ type: 'form', id: goal.id })}
        onAchieved={(title) => {
          setPanel(null)
          setCelebrating(title)
        }}
      />

      <GoalFormDrawer
        open={formOpen}
        goal={formGoal}
        habitBlocks={habitBlocks}
        projects={projects}
        onClose={() => setPanel(null)}
        onSaved={(id, isNew) => {
          setFilter('active')
          setPanel(isNew || !id ? null : { type: 'detail', id })
        }}
      />

      <GoalCelebration
        title={celebrating}
        onClose={() => setCelebrating(null)}
        onSeeShowcase={() => {
          setCelebrating(null)
          setFilter('done')
        }}
      />
    </>
  )
}
