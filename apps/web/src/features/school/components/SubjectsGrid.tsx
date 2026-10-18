'use client'

import { motion } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { EASE_OUT } from '@/lib/motion'

import { formatGrade, subjectAverage } from '../school-utils'
import { ASSIGNMENT_KIND_LABEL, WEEKDAY_LABEL } from '../types'
import type { Assignment, Subject } from '../types'

import colors from './SchoolColors.module.css'
import styles from './SubjectsGrid.module.css'

type SubjectsGridProps = {
  subjects: Subject[]
  assignments: Assignment[]
  onDelete: (subject: Subject) => void
  onNewSubject: () => void
}

function nextAssignmentText(
  subjectId: string,
  assignments: Assignment[],
): string {
  const next = assignments
    .filter((a) => a.subjectId === subjectId && !a.done)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))[0]
  if (!next) return 'Sin entregas pendientes'
  return `${ASSIGNMENT_KIND_LABEL[next.kind]}: ${next.title}`
}

function scheduleText(subject: Subject): string {
  const days = subject.days
    .map((day) => WEEKDAY_LABEL[day].slice(0, 3))
    .join(' y ')
  return `${days} · ${subject.startsAt}`
}

export function SubjectsGrid({
  subjects,
  assignments,
  onDelete,
  onNewSubject,
}: SubjectsGridProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  if (subjects.length === 0) {
    return (
      <EmptyState
        id="subjects-empty"
        title="Todavía no hay materias"
        description="Agrega tu primera materia del semestre para llevar horario, entregas y calificaciones."
        actions={<Button onClick={onNewSubject}>Agregar materia</Button>}
      />
    )
  }

  return (
    <div className={styles.grid}>
      {subjects.map((subject, index) => {
        const average = subjectAverage(subject.grades)
        const confirming = confirmingId === subject.id
        return (
          <motion.article
            key={subject.id}
            className={styles.card}
            aria-label={subject.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.4,
                ease: EASE_OUT,
                delay: index * 0.04,
              },
            }}
          >
            <span
              className={[styles.bar, colors[`subject_${subject.color}`]].join(
                ' ',
              )}
            />
            <div className={styles.head}>
              <div className={styles.titles}>
                <span className={styles.name}>{subject.name}</span>
                {subject.teacher ? (
                  <span className={styles.teacher}>{subject.teacher}</span>
                ) : null}
              </div>
              <Button
                variant="plain"
                iconOnly
                aria-label={`Borrar materia ${subject.name}`}
                onClick={() => setConfirmingId(subject.id)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </svg>
              </Button>
            </div>
            <div className={styles.chips}>
              <span className={styles.chip}>{scheduleText(subject)}</span>
              <span className={styles.chip}>{subject.room}</span>
            </div>
            <div className={styles.avgRow}>
              <span className={styles.avgLabel}>Promedio</span>
              <span className={styles.avgValue}>{formatGrade(average)}</span>
            </div>
            <span className={styles.next}>
              {nextAssignmentText(subject.id, assignments)}
            </span>
            {confirming ? (
              <div
                role="alertdialog"
                aria-label={`¿Borrar ${subject.name}?`}
                className={styles.confirm}
              >
                <span>
                  ¿Borrar {subject.name}? Se van a la papelera sus entregas, sus
                  clases del horario y sus calificaciones.
                </span>
                <div className={styles.confirmActions}>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setConfirmingId(null)
                      onDelete(subject)
                    }}
                  >
                    Borrar materia
                  </Button>
                </div>
              </div>
            ) : null}
          </motion.article>
        )
      })}
    </div>
  )
}
