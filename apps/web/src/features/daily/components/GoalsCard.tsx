'use client'

import { motion } from 'motion/react'

import { Card, CardHeader, CardLink, LineIcon } from '@/components/ui/Card'
import { CountUp, ProgressBar } from '@/components/ui/Progress'
import { fadeUp, staggerList } from '@/lib/motion'

import type { Goal } from '../types'

import styles from './DailyCards.module.css'

// "Metas" de Inicio (Main.dc.html): cada barra se llena escalonada, y el
// porcentaje cuenta hasta su valor al mismo ritmo.
export function GoalsCard({ goals }: { goals: Goal[] }) {
  return (
    <Card as="section" className={styles.card} aria-labelledby="home-goals">
      <CardHeader
        id="home-goals"
        title="Metas"
        iconTone="accent"
        icon={<LineIcon d={['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z']} />}
        action={<CardLink href="/dia-a-dia/metas">Ver metas</CardLink>}
      />
      <motion.ul className={styles.goals} variants={staggerList(0.08, 0.1)} initial="hidden" animate="show">
        {goals.map((goal, index) => {
          const ratio = goal.target > 0 ? goal.current / goal.target : 0
          return (
            <motion.li key={goal.id} className={styles.goal} variants={fadeUp}>
              <div className={styles.goalHead}>
                <span className={styles.goalName}>{goal.title}</span>
                <span className={styles.goalPct}>
                  <CountUp value={Math.round(Math.min(1, ratio) * 100)} format={(n) => `${Math.round(n)}%`} />
                </span>
              </div>
              <ProgressBar value={ratio} label={`Avance de ${goal.title}`} delay={0.15 + index * 0.08} />
            </motion.li>
          )
        })}
      </motion.ul>
    </Card>
  )
}
