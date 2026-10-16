'use client'

import { motion } from 'motion/react'

import { LineIcon } from '@/components/ui/Card'
import { CountUp, ProgressBar } from '@/components/ui/Progress'
import { Doodle } from '@/components/ui/Doodle'
import type { IsoDate } from '@/lib/dates'
import { EASE_OUT } from '@/lib/motion'

import { goalAchievedText, goalDueText, goalPercent, goalProgressText, goalRatio } from '../goal-utils'
import { GOAL_AREA_LABEL, GOAL_KIND_ICON, GOAL_KIND_LABEL } from '../routine-meta'
import type { Goal } from '../types'

import styles from './GoalCard.module.css'

type GoalCardProps = {
  goal: Goal
  today: IsoDate
  // Para escalonar la entrada de varias tarjetas seguidas.
  delay?: number
  onOpen: (goal: Goal) => void
}

export function AreaChip({ area, className }: { area: Goal['area']; className?: string }) {
  return <span className={[styles.chip, styles[`area_${area}`], className].filter(Boolean).join(' ')}>{GOAL_AREA_LABEL[area]}</span>
}

// Una meta activa o en pausa (Metas.dc.html): área, cómo se mide, el avance, el porqué y la fecha.
export function GoalCard({ goal, today, delay = 0, onOpen }: GoalCardProps) {
  return (
    <motion.button
      type="button"
      className={[styles.card, goal.status === 'paused' ? styles.paused : null].filter(Boolean).join(' ')}
      onClick={() => onOpen(goal)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT, delay } }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className={styles.top}>
        <AreaChip area={goal.area} />
        <span className={styles.kind}>
          <LineIcon d={GOAL_KIND_ICON[goal.kind]} size={14} strokeWidth={2} />
          {GOAL_KIND_LABEL[goal.kind]}
        </span>
      </div>
      <span className={styles.title}>{goal.title}</span>
      <div className={styles.progress}>
        <div className={styles.numbers}>
          <span className={styles.percent}>
            <CountUp value={goalPercent(goal)} format={(n) => `${Math.round(n)}%`} />
          </span>
          <span className={styles.progressText}>{goalProgressText(goal)}</span>
        </div>
        <ProgressBar value={Math.max(0.03, goalRatio(goal))} label={`Avance de ${goal.title}`} delay={delay + 0.1} />
      </div>
      {goal.why ? <span className={styles.why}>“{goal.why}”</span> : null}
      <span className={styles.due}>
        <LineIcon d={['M3 7h18v14H3z', 'M3 11h18M8 5v4M16 5v4']} size={14} />
        {goal.status === 'paused' ? 'En pausa · avance guardado' : goalDueText(goal, today)}
      </span>
    </motion.button>
  )
}

// Una meta lograda (la vitrina): tarjeta oscura con su estrella.
export function AchievedGoalCard({ goal, delay = 0 }: { goal: Goal; delay?: number }) {
  return (
    <motion.div
      className={styles.achieved}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT, delay } }}
    >
      <span className={styles.star} aria-hidden="true">
        <Doodle kind="star" size={74} stroke="inverted" strokeWidth={1.8} />
      </span>
      <span className={[styles.chip, styles.area_school, styles.achievedChip].join(' ')}>{GOAL_AREA_LABEL[goal.area]}</span>
      <span className={styles.achievedTitle}>{goal.title}</span>
      <span className={styles.achievedWhen}>{goalAchievedText(goal)}</span>
    </motion.div>
  )
}
