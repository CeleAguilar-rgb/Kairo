import { WEEKDAYS } from '@kairo/shared'

import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

import { buildScheduleGrid, formatHour } from '../school-utils'
import { WEEKDAY_LABEL } from '../types'
import type { Subject } from '../types'

import colors from './SchoolColors.module.css'
import styles from './ScheduleGrid.module.css'

// El horario de clases (Escuela.dc.html): una cuadrícula semana × hora, con
// solo las horas que de verdad tienen clase. "Las clases salen también en tu
// Agenda y en Día a día" cuando exista la conexión real (Fase 1b).
export function ScheduleGrid({ subjects }: { subjects: Subject[] }) {
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
      />
      <div className={styles.scroll}>
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
      </div>
    </Card>
  )
}
