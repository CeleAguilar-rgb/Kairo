'use client'

import { useRef, useState, type KeyboardEvent } from 'react'

import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'

import { formatGrade, overallAverage, subjectAverage } from '../school-utils'
import { GRADE_LABEL, type GradeField, type Subject } from '../types'

import colors from './SchoolColors.module.css'
import styles from './GradesTable.module.css'

type GradesTableProps = {
  subjects: Subject[]
  // Devuelve si se guardó: si no, la casilla vuelve a lo que tenía.
  onSave: (
    subject: Subject,
    field: GradeField,
    value: number | null,
  ) => Promise<boolean>
}

const FIELDS: GradeField[] = ['midterm1', 'midterm2', 'final']

const toText = (value: number | null) => (value === null ? '' : value.toFixed(1))

// Lo que se tecleó: vacío = sin calificar, y acepta la coma decimal. undefined = no es un número.
function parseGrade(text: string): number | null | undefined {
  const clean = text.trim().replace(',', '.')
  if (clean === '') return null
  const value = Number(clean)
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : undefined
}

type GradeCellProps = {
  label: string
  value: number | null
  onCommit: (value: number | null) => Promise<boolean>
}

// Una casilla de calificación: se ve como texto de la tabla (con guion si está vacía) y se vuelve campo al
// tocarla. Guarda al salir de ella o con Enter; Escape la deja como estaba. Lo que se teclea se ve al instante y
// vuelve atrás si la API no lo guarda.
function GradeCell({ label, value, onCommit }: GradeCellProps) {
  const toast = useToast()
  const [text, setText] = useState(toText(value))
  const [seen, setSeen] = useState(value)
  // Escape sale de la casilla (blur) y ese blur no debe guardar lo que se había escrito.
  const cancelled = useRef(false)
  // Cuando llega un valor nuevo de la API (después de guardar, o al recargar), ese manda.
  if (value !== seen) {
    setSeen(value)
    setText(toText(value))
  }

  async function commit() {
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    const next = parseGrade(text)
    if (next === undefined || (next !== null && (next < 0 || next > 10))) {
      toast.show({ message: 'La calificación va del 0 al 10.', icon: 'info' })
      setText(toText(value))
      return
    }
    setText(toText(next))
    if (next === value) return
    const saved = await onCommit(next)
    if (!saved) setText(toText(value))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') {
      cancelled.current = true
      setText(toText(value))
      event.currentTarget.blur()
    }
  }

  return (
    <input
      className={styles.gradeInput}
      type="text"
      inputMode="decimal"
      maxLength={4}
      placeholder="—"
      aria-label={label}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}

export function GradesTable({ subjects, onSave }: GradesTableProps) {
  if (subjects.length === 0) {
    return (
      <EmptyState
        id="grades-empty"
        title="Sin calificaciones"
        description="Cuando agregues materias, sus parciales van a aparecer aquí."
      />
    )
  }

  const average = overallAverage(subjects)

  return (
    <Card aria-label="Calificaciones" className={styles.card}>
      <div className={styles.head}>
        <CardHeader
          id="grades-title"
          title="Calificaciones"
          icon={<LineIcon d="M5 12l5 5L20 7" />}
        />
        <span className={styles.gpa}>
          Promedio general{' '}
          <b className={styles.gpaValue}>{formatGrade(average)}</b>
        </span>
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Materia</th>
              {FIELDS.map((field) => (
                <th key={field} scope="col">
                  {GRADE_LABEL[field]}
                </th>
              ))}
              <th scope="col">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td className={styles.name}>
                  <span
                    className={[
                      styles.dot,
                      colors[`subject_${subject.color}`],
                    ].join(' ')}
                  />
                  {subject.name}
                </td>
                {FIELDS.map((field) => (
                  <td key={field}>
                    <GradeCell
                      label={`${GRADE_LABEL[field]} de ${subject.name}`}
                      value={subject.grades[field]}
                      onCommit={(value) => onSave(subject, field, value)}
                    />
                  </td>
                ))}
                <td className={styles.average}>
                  {formatGrade(subjectAverage(subject.grades))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className={styles.hint}>
        Escala de 0 a 10. Toca una casilla para escribir la calificación; si la
        dejas vacía, queda con guion.
      </span>
    </Card>
  )
}
