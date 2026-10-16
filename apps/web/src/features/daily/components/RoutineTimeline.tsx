'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'

import { Checkbox } from '@/components/ui/Checkbox'
import { LineIcon } from '@/components/ui/Card'
import { formatWallTime, minutesToWallTime } from '@/lib/dates'
import { DURATION, EASE_OUT, fadeUp, staggerList } from '@/lib/motion'

import { ROUTINE_ICON_META } from '../routine-meta'
import {
  blockState,
  currentBlock,
  doneText,
  endMinutes,
  nowMarkerIndex,
  overdueText,
  startMinutes,
  type BlockState,
} from '../routine-utils'
import type { FocusInfo, RoutineBlockToday } from '../types'

import styles from './RoutineTimeline.module.css'

type RoutineTimelineProps = {
  blocks: RoutineBlockToday[]
  focus: Record<string, FocusInfo>
  nowMinutes: number
  hourFormat: '12h' | '24h'
  onToggle: (block: RoutineBlockToday) => void
  onCompleteTask: (block: RoutineBlockToday) => void
  onPomodoro: () => void
}

// La línea de tiempo de hoy (DiaADia.dc.html): cada bloque con su hora, su ícono y su casilla, una raya
// punteada en "ahora", y el bloque de enfoque en curso como tarjeta oscura con su siguiente tarea.
export function RoutineTimeline({ blocks, focus, nowMinutes, hourFormat, onToggle, onCompleteTask, onPomodoro }: RoutineTimelineProps) {
  const current = currentBlock(blocks, nowMinutes)
  const markerBefore = nowMarkerIndex(blocks, nowMinutes)
  const nowText = formatWallTime(minutesToWallTime(nowMinutes), hourFormat)

  const items = blocks.flatMap((block, index) => {
    const marker = markerBefore === index ? [<NowLine key="now" text={nowText} />] : []
    const isFocusCard = block.kind === 'focus' && current?.id === block.id && focus[block.id]
    const row = isFocusCard ? (
      <FocusCard
        key={block.id}
        block={block}
        info={focus[block.id]}
        nowMinutes={nowMinutes}
        hourFormat={hourFormat}
        onCompleteTask={onCompleteTask}
        onPomodoro={onPomodoro}
      />
    ) : (
      <TimelineRow key={block.id} block={block} info={focus[block.id]} nowMinutes={nowMinutes} hourFormat={hourFormat} onToggle={onToggle} />
    )
    return [...marker, row]
  })
  if (markerBefore === blocks.length) items.push(<NowLine key="now" text={nowText} />)

  return (
    <motion.ol className={styles.list} variants={staggerList(0.04, 0.2)} initial="hidden" animate="show">
      {items}
    </motion.ol>
  )
}

function NowLine({ text }: { text: string }) {
  return (
    <li className={styles.now}>
      <span className={styles.nowTime}>
        <span className={styles.srOnly}>Ahora, </span>
        {text}
      </span>
    </li>
  )
}

type RowProps = {
  block: RoutineBlockToday
  info?: FocusInfo
  nowMinutes: number
  hourFormat: '12h' | '24h'
}

function rangeText(block: RoutineBlockToday, hourFormat: '12h' | '24h') {
  const start = formatWallTime(block.startsAt, hourFormat)
  return block.endsAt ? `${start} – ${formatWallTime(block.endsAt, hourFormat)}` : start
}

// La línea gris bajo el título, según cómo va el bloque.
function subText(block: RoutineBlockToday, state: BlockState, nowMinutes: number, hourFormat: '12h' | '24h', info?: FocusInfo) {
  if (state === 'done' || state === 'late') return doneText(block, hourFormat)
  if (state === 'overdue') return overdueText(block, nowMinutes)
  if (state === 'free') return 'No cuenta para el reporte'
  if (block.kind === 'focus') return info && info.doneCount >= info.tasks.length ? `Nada pendiente en ${info.areaLabel}` : block.note ? `Siguiente: ${block.note}` : ''
  return block.note ?? ''
}

function TimelineRow({ block, info, nowMinutes, hourFormat, onToggle }: RowProps & { onToggle: (block: RoutineBlockToday) => void }) {
  const state = blockState(block, nowMinutes)
  const done = state === 'done' || state === 'late'
  const sub = subText(block, state, nowMinutes, hourFormat, info)
  const time = formatWallTime(block.startsAt, hourFormat)

  return (
    <motion.li variants={fadeUp} className={styles.row}>
      <span className={[styles.time, state === 'upcoming' ? styles.timeFuture : null].filter(Boolean).join(' ')}>{time}</span>
      <span className={[styles.icon, done ? styles.iconDone : null, state === 'overdue' ? styles.iconOverdue : null, state === 'free' ? styles.iconFree : null].filter(Boolean).join(' ')}>
        <LineIcon d={ROUTINE_ICON_META[block.icon].d} size={20} />
      </span>
      <div className={styles.text}>
        <span className={[styles.title, done ? styles.titleDone : null].filter(Boolean).join(' ')}>{block.title}</span>
        {sub ? (
          <span className={[styles.sub, state === 'late' ? styles.subLate : null, state === 'overdue' ? styles.subOverdue : null].filter(Boolean).join(' ')}>{sub}</span>
        ) : null}
      </div>
      {state === 'free' ? (
        <span className={styles.rangeChip}>{rangeText(block, hourFormat)}</span>
      ) : (
        <Checkbox
          checked={done}
          tone={state === 'overdue' ? 'danger' : 'surface'}
          label={`${done ? 'Desmarcar' : 'Marcar como hecho'}: ${block.title} ${time}`}
          onToggle={() => onToggle(block)}
        />
      )}
    </motion.li>
  )
}

function FocusCard({
  block,
  info,
  nowMinutes,
  hourFormat,
  onCompleteTask,
  onPomodoro,
}: RowProps & { info: FocusInfo; onCompleteTask: (block: RoutineBlockToday) => void; onPomodoro: () => void }) {
  const nextTask = info.tasks[info.doneCount] ?? null
  const elapsed = Math.max(0, nowMinutes - startMinutes(block))
  const total = endMinutes(block) - startMinutes(block)
  const progressText =
    info.doneCount === 0 ? `Llevas ${elapsed} min de ${total}` : `${info.doneCount} ${info.doneCount === 1 ? 'tarea hecha' : 'tareas hechas'} en este bloque`

  return (
    <motion.li variants={fadeUp} className={[styles.row, styles.focusRow].join(' ')}>
      <span className={styles.focusTime}>{formatWallTime(block.startsAt, hourFormat)}</span>
      <span className={[styles.icon, styles.iconFocus].join(' ')}>
        <LineIcon d={ROUTINE_ICON_META[block.icon].d} size={20} />
      </span>
      <div className={styles.focus}>
        <div className={styles.focusHead}>
          <div className={styles.focusTitles}>
            <span className={styles.focusTitle}>{block.title}</span>
            <span className={styles.focusMeta}>
              {rangeText(block, hourFormat)} · {info.areaLabel} · ahora
            </span>
          </div>
          <span className={styles.focusChip}>Enfoque</span>
        </div>

        <div className={styles.task}>
          <Checkbox
            tone="inverted"
            checked={false}
            label={nextTask ? `Marcar tarea como hecha: ${nextTask}` : 'No hay tareas pendientes'}
            onToggle={() => nextTask && onCompleteTask(block)}
            className={nextTask ? undefined : styles.taskCheckOff}
          />
          <div className={styles.taskText}>
            <span className={styles.taskKicker}>{info.doneCount === 0 ? `Tu siguiente tarea de ${info.areaLabel}` : 'Listo. Sigue con'}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={info.doneCount}
                className={styles.taskName}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -4, transition: { duration: DURATION.fast } }}
              >
                {nextTask ?? `Nada pendiente en ${info.areaLabel}`}
              </motion.span>
            </AnimatePresence>
          </div>
          <Link href="/tareas" className={styles.taskLink}>
            Ver tarea
          </Link>
        </div>

        <div className={styles.focusActions}>
          <button type="button" className={styles.pomodoro} onClick={onPomodoro}>
            <LineIcon d={['M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M12 9v4l2 2M10 2h4']} size={16} strokeWidth={2} />
            Iniciar pomodoro
          </button>
          <span className={styles.focusProgress}>{progressText}</span>
        </div>
      </div>
    </motion.li>
  )
}
