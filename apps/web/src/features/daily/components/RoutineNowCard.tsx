'use client'

import { motion } from 'motion/react'
import { useOptimistic, useTransition } from 'react'

import { Card, CardHeader, CardLink, LineIcon } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { useToast } from '@/components/ui/Toast'
import { formatWallTime, minutesToWallTime } from '@/lib/dates'
import { EASE_OUT, fadeUp, staggerList } from '@/lib/motion'

import { toggleRoutineBlockAction } from '../routine-actions'
import { currentBlock, endMinutes, isLateMark, isOverdue, startMinutes } from '../routine-utils'
import { ROUTINE_KIND_LABEL, type RoutineBlockToday } from '../types'

import styles from './RoutineNowCard.module.css'

type RoutineNowCardProps = {
  blocks: RoutineBlockToday[]
  // Minutos desde medianoche en la zona del perfil, calculados en el servidor
  // (si se calcularan aquí, el HTML del servidor y el del navegador no coincidirían).
  nowMinutes: number
  hourFormat: '12h' | '24h'
}

// Cuántas líneas caben debajo del bloque actual sin que la tarjeta crezca.
const MAX_LINES = 3

// "Ahora en tu rutina" (Main.dc.html): el bloque en curso (o el siguiente),
// lo que ya pasó sin marcar (en rojo) y lo que viene.
export function RoutineNowCard({ blocks: allBlocks, nowMinutes, hourFormat }: RoutineNowCardProps) {
  const toast = useToast()
  const [, startTransition] = useTransition()
  // Los hábitos (agua, vitaminas…) no son "lo que sigue" sino una lista de checks del día: van aparte,
  // abajo, y se marcan desde aquí sin entrar a Día a día. Optimista: la palomita se ve al instante y la
  // Server Action va detrás (si falla, el estado vuelve solo al del servidor y sale un aviso).
  const [visible, applyMark] = useOptimistic(allBlocks, (current, mark: { id: string; done: boolean }) =>
    current.map((block) =>
      block.id !== mark.id ? block : { ...block, log: mark.done ? { doneAt: minutesToWallTime(nowMinutes), late: isLateMark(block, nowMinutes) } : null },
    ),
  )
  const habits = visible.filter((block) => block.kind === 'habit')
  const blocks = visible.filter((block) => block.kind !== 'habit')

  const toggleHabit = (block: RoutineBlockToday) =>
    startTransition(async () => {
      const done = block.log === null
      applyMark({ id: block.id, done })
      const result = await toggleRoutineBlockAction({ blockId: block.id, done })
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo guardar. Intenta de nuevo.', icon: 'info' })
    })
  const habitsDone = habits.filter((block) => block.log !== null).length

  // Solo un bloque con rango puede estar "en curso"; un hábito es un momento.
  const current = currentBlock(blocks, nowMinutes)
  const upcoming = blocks.filter((b) => startMinutes(b) > nowMinutes)
  const focus = current ?? upcoming[0] ?? null
  // Lo que ya se insistió y sigue sin marcar (en rojo).
  const missed = blocks.filter((b) => isOverdue(b, nowMinutes))
  const rest = upcoming.filter((b) => b.id !== focus?.id)
  const lines = [...missed.map((b) => ({ block: b, missed: true })), ...rest.map((b) => ({ block: b, missed: false }))].slice(0, MAX_LINES)

  // Qué tanto del bloque actual ya pasó (0 a 1), para la barrita de avance.
  const elapsed = current ? (nowMinutes - startMinutes(current)) / (endMinutes(current) - startMinutes(current)) : 0

  return (
    <Card as="section" tone="inverted" className={styles.card} aria-labelledby="home-routine">
      <CardHeader
        id="home-routine"
        title="Ahora en tu rutina"
        iconTone="inverted"
        icon={<LineIcon d={['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2']} />}
        action={<CardLink href="/dia-a-dia">Día a día</CardLink>}
      />

      {focus ? (
        <motion.div className={styles.now} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }}>
          <span className={styles.nowMeta}>
            {current ? (
              <span className={styles.live} aria-label="En curso">
                <span className={styles.livePulse} aria-hidden="true" />
              </span>
            ) : (
              <span className={styles.nextTag}>Sigue</span>
            )}
            {formatWallTime(focus.startsAt, hourFormat)}{focus.endsAt ? ` – ${formatWallTime(focus.endsAt, hourFormat)}` : ''} · {ROUTINE_KIND_LABEL[focus.kind]}
          </span>
          <span className={styles.nowTitle}>{focus.title}</span>
          {focus.note ? <span className={styles.nowNote}>→ {focus.note}</span> : null}
          {current ? (
            <span className={styles.elapsedTrack} aria-hidden="true">
              <motion.span
                className={styles.elapsedFill}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: elapsed }}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.3 }}
              />
            </span>
          ) : null}
        </motion.div>
      ) : (
        <div className={styles.now}>
          <span className={styles.nowTitle}>Terminaste tu rutina de hoy</span>
          <span className={styles.nowNote}>Mañana empieza de nuevo.</span>
        </div>
      )}

      {lines.length > 0 ? (
        <motion.ul className={styles.lines} variants={staggerList(0.06, 0.25)} initial="hidden" animate="show">
          {lines.map(({ block, missed }) => (
            <motion.li key={block.id} variants={fadeUp} className={[styles.line, missed ? styles.lineMissed : null].filter(Boolean).join(' ')}>
              <span className={styles.lineTime}>{formatWallTime(block.startsAt, hourFormat)}</span>
              <span>
                {block.title}
                {missed ? ' · no marcado' : block.kind === 'meal' && block.note ? ` · ${block.note}` : ''}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      ) : null}

      {habits.length > 0 ? (
        <section className={styles.habits} aria-labelledby="home-habits">
          <h3 id="home-habits" className={styles.habitsTitle}>
            Hábitos de hoy
            <span className={styles.habitsCount}>
              {habitsDone}/{habits.length}
            </span>
          </h3>
          <ul className={styles.habitList}>
            {habits.map((block) => {
              const overdue = isOverdue(block, nowMinutes)
              return (
                <li key={block.id} className={styles.habit}>
                  <Checkbox
                    checked={block.log !== null}
                    onToggle={() => toggleHabit(block)}
                    label={`${block.log !== null ? 'Desmarcar' : 'Marcar'} ${block.title}`}
                    tone={overdue ? 'danger' : 'inverted'}
                  />
                  <span className={[styles.habitName, block.log !== null ? styles.habitDone : null, overdue ? styles.habitMissed : null].filter(Boolean).join(' ')}>{block.title}</span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </Card>
  )
}
