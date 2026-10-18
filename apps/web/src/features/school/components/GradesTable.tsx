import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

import { formatGrade, overallAverage, subjectAverage } from '../school-utils'
import type { Subject } from '../types'

import colors from './SchoolColors.module.css'
import styles from './GradesTable.module.css'

export function GradesTable({ subjects }: { subjects: Subject[] }) {
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
              <th scope="col">Parcial 1</th>
              <th scope="col">Parcial 2</th>
              <th scope="col">Final</th>
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
                <td>{formatGrade(subject.grades.midterm1)}</td>
                <td>{formatGrade(subject.grades.midterm2)}</td>
                <td className={styles.muted}>
                  {formatGrade(subject.grades.final)}
                </td>
                <td className={styles.average}>
                  {formatGrade(subjectAverage(subject.grades))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className={styles.hint}>
        Escala de 0 a 10. Las que faltan se marcan con guion.
      </span>
    </Card>
  )
}
