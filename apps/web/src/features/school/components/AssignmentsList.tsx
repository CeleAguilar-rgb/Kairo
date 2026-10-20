'use client'

import { motion } from 'motion/react'

import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDayMonth } from '@/lib/dates'
import { fadeUp, staggerList } from '@/lib/motion'

import { groupAssignments, isAssignmentOverdue } from '../school-utils'
import { ASSIGNMENT_KIND_LABEL } from '../types'
import type { Assignment, Subject } from '../types'

import colors from './SchoolColors.module.css'
import styles from './AssignmentsList.module.css'

type AssignmentsListProps = {
  assignments: Assignment[]
  subjects: Subject[]
  today: string
  onToggle: (assignment: Assignment) => void
}

export function AssignmentsList({
  assignments,
  subjects,
  today,
  onToggle,
}: AssignmentsListProps) {
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]))
  const groups = groupAssignments(assignments, today)

  if (groups.length === 0) {
    return (
      <EmptyState
        id="assignments-empty"
        title="No hay entregas"
        description="Cuando agregues materias y les pongas tareas (en Tareas, con la materia como proyecto), sus entregas van a aparecer aquí."
      />
    )
  }

  return (
    <Card aria-label="Entregas" className={styles.card}>
      <CardHeader
        id="assignments-title"
        title="Entregas"
        icon={<LineIcon d={['M4 4h16v16H4z', 'M8.5 12l2.5 2.5 4.5-5']} />}
      />
      {groups.map((group) => (
        <div key={group.name} className={styles.group}>
          <span className={styles.groupName}>{group.name}</span>
          <motion.div
            variants={staggerList(0.03)}
            initial="hidden"
            animate="show"
          >
            {group.items.map((assignment) => {
              const subject = subjectById.get(assignment.subjectId)
              const overdue = isAssignmentOverdue(assignment, today)
              return (
                <motion.div
                  key={assignment.id}
                  variants={fadeUp}
                  className={styles.row}
                >
                  <Checkbox
                    checked={assignment.done}
                    onToggle={() => onToggle(assignment)}
                    label={`Entregado: ${assignment.title}`}
                  />
                  <div className={styles.titles}>
                    <span
                      className={
                        assignment.done ? styles.titleDone : styles.title
                      }
                    >
                      {assignment.title}
                    </span>
                    {assignment.kind ? (
                      <span className={styles.kind}>
                        {ASSIGNMENT_KIND_LABEL[assignment.kind]}
                      </span>
                    ) : null}
                  </div>
                  {subject ? (
                    <span
                      className={[
                        styles.subjectChip,
                        colors[`subject_${subject.color}`],
                      ].join(' ')}
                    >
                      {subject.name.split(' ')[0]}
                    </span>
                  ) : null}
                  <span className={overdue ? styles.dueOverdue : styles.due}>
                    {assignment.dueOn ? formatDayMonth(assignment.dueOn) : ''}
                  </span>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      ))}
      <span className={styles.hint}>
        Cada entrega es una tarea: sale en Tareas, en Inicio y en tu bloque de
        rutina &ldquo;Avanzar escuela&rdquo;.
      </span>
    </Card>
  )
}
