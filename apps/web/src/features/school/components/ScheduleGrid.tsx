'use client'

import { WEEKDAYS } from '@kairo/shared'
import { useState } from 'react'

import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScrollFade } from '@/components/ui/ScrollFade'
import { useNarrowScreen } from '@/lib/use-narrow-screen'

import { buildScheduleGrid, formatHour } from '../school-utils'
import type { ScheduleBlock } from '../school-utils'
import { WEEKDAY_LABEL } from '../types'
import type { Subject } from '../types'

import colors from './SchoolColors.module.css'
import styles from './ScheduleGrid.module.css'

// El horario de clases (Escuela.dc.html): una cuadrícula semana × hora, con
// solo las horas que de verdad tienen clase. Cada bloque es un evento semanal
// de Agenda ligado a la materia (decisión #43): por eso "salen también en tu
// Agenda".
type ScheduleView = 'week' | 'days'

export function ScheduleGrid({ subjects }: { subjects: Subject[] }) {
  // En el teléfono abre "Por día" (una cuadrícula de 720 px obliga a deslizar y solo se verían lunes y martes);
  // si la persona elige otra vista, esa manda. Es un valor por defecto, no esconde nada (eso es del CSS).
  const narrow = useNarrowScreen()
  const [picked, setPicked] = useState<ScheduleView | null>(null)
  const view: ScheduleView = picked ?? (narrow ? 'days' : 'week')

  if (subjects.length === 0) {
    return (
      <EmptyState
        id="schedule-empty"
        title="Todavía no hay materias"
        description="Agrega tu primera materia para armar el horario de la semana."
      />
    )
  }

  const { hours, blocks } = buildScheduleGrid(subjects)

  return (
    <Card aria-label="Horario de clases" className={styles.card}>
      <CardHeader
        id="schedule-title"
        title="Horario de clases"
        subtitle="Las clases salen también en tu Agenda y en Día a día."
        icon={<LineIcon d={['M3 5h18v16H3z', 'M3 10h18M8 3v4M16 3v4']} />}
        inline
        action={
          <button
            type="button"
            className={styles.viewToggle}
            aria-label={view === 'week' ? 'Ver el horario por día' : 'Ver el horario de la semana'}
            title={view === 'week' ? 'Por día' : 'Semana'}
            onClick={() => setPicked(view === 'week' ? 'days' : 'week')}
          >
            {/* Muestra la vista a la que se cambia: la lista para ir a "Por día", la cuadrícula para volver. */}
            <LineIcon
              d={
                view === 'week'
                  ? ['M8 6h13M8 12h13M8 18h13', 'M3 6h.01M3 12h.01M3 18h.01']
                  : ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z']
              }
              size={20}
            />
          </button>
        }
      />
      {view === 'days' ? (
        <DayList blocks={blocks} />
      ) : (
      <ScrollFade className={styles.scroll}>
        <div
          className={styles.grid}
          style={{ gridTemplateRows: `auto repeat(${hours.length}, 52px)` }}
        >
          <span />
          {WEEKDAYS.map((day) => (
            <span key={day} className={styles.dayLabel}>
              {WEEKDAY_LABEL[day].slice(0, 3)}
            </span>
          ))}
          {hours.map((hour, rowIndex) => (
            <span
              key={hour}
              className={styles.hourLabel}
              style={{ gridRow: rowIndex + 2, gridColumn: 1 }}
            >
              {formatHour(hour)}
            </span>
          ))}
          {hours.map((hour, rowIndex) =>
            WEEKDAYS.map((_, dayIndex) => (
              <span
                key={`${hour}-${dayIndex}`}
                className={styles.cell}
                style={{ gridRow: rowIndex + 2, gridColumn: dayIndex + 2 }}
              />
            )),
          )}
          {blocks.map((block) => (
            <div
              key={`${block.subjectId}-${block.dayIndex}`}
              className={[styles.block, colors[`subject_${block.color}`]].join(
                ' ',
              )}
              style={{
                gridRow: `${block.rowStart + 2} / span ${block.rowSpan}`,
                gridColumn: block.dayIndex + 2,
              }}
            >
              <span className={styles.blockName}>{block.name}</span>
              <span className={styles.blockMeta}>{block.meta}</span>
            </div>
          ))}
        </div>
      </ScrollFade>
      )}
    </Card>
  )
}

// La misma información que la cuadrícula, pero un bloque por día con sus clases en orden de hora: para el
// teléfono, donde una cuadrícula de siete columnas obliga a deslizar. Los días sin clase no se listan.
function DayList({ blocks }: { blocks: ScheduleBlock[] }) {
  const days = WEEKDAYS.map((day, dayIndex) => ({
    day,
    blocks: blocks
      .filter((block) => block.dayIndex === dayIndex)
      .sort((a, b) => a.rowStart - b.rowStart || a.meta.localeCompare(b.meta)),
  })).filter((entry) => entry.blocks.length > 0)

  return (
    <div className={styles.dayList}>
      {days.map(({ day, blocks: dayBlocks }) => (
        <section key={day} className={styles.dayGroup} aria-label={WEEKDAY_LABEL[day]}>
          <h3 className={styles.dayTitle}>{WEEKDAY_LABEL[day]}</h3>
          {dayBlocks.map((block) => (
            <div
              key={`${block.subjectId}-${block.rowStart}`}
              className={[styles.dayBlock, colors[`subject_${block.color}`]].join(' ')}
            >
              <span className={styles.blockName}>{block.name}</span>
              <span className={styles.blockMeta}>{block.meta}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
