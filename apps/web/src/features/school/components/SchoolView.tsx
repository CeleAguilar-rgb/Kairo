'use client'

import { useState, useTransition } from 'react'

import { useToast } from '@/components/ui/Toast'
import { formatDayMonth, formatRange } from '@/lib/dates'

import {
  deleteSubjectAction,
  setAssignmentDoneAction,
  setGradeAction,
  setPrepItemDoneAction,
} from '../actions'
import type {
  Assignment,
  GradeField,
  PrepItem,
  ProjectRef,
  SchoolMode,
  SchoolTab,
  Subject,
  Term,
} from '../types'

import { AssignmentsList } from './AssignmentsList'
import { GradesTable } from './GradesTable'
import { PrepView } from './PrepView'
import { SchoolHeader } from './SchoolHeader'
import styles from './SchoolView.module.css'
import { ScheduleGrid } from './ScheduleGrid'
import { SubjectDrawer } from './SubjectDrawer'
import { SubjectsGrid } from './SubjectsGrid'
import { TermDrawer } from './TermDrawer'
import { TermTabs } from './TermTabs'

type SchoolViewProps = {
  term: Term | null
  subjects: Subject[]
  assignments: Assignment[]
  prepItems: PrepItem[]
  projectOptions: ProjectRef[]
  daysLeft: number | null
  initialMode: SchoolMode
  goalLabel: string
  today: string
}

// Escuela (Escuela.dc.html): dos "momentos" — Antes de empezar (cuenta
// regresiva y preparación) y Durante el semestre (horario, materias,
// entregas, calificaciones en pestañas). Es una sola pantalla con todo el
// estado de vista aquí mismo: a diferencia de Día a día o Proyectos, el
// canvas no le da una URL a cada pestaña.
export function SchoolView({
  term,
  subjects,
  assignments,
  prepItems,
  projectOptions,
  daysLeft,
  initialMode,
  goalLabel,
  today,
}: SchoolViewProps) {
  const toast = useToast()
  const [, startTransition] = useTransition()
  const [mode, setMode] = useState<SchoolMode>(initialMode)
  const [tab, setTab] = useState<SchoolTab>('schedule')
  const [subjectDrawerOpen, setSubjectDrawerOpen] = useState(false)
  const [termDrawerOpen, setTermDrawerOpen] = useState(false)

  const subtitle = !term
    ? 'Todavía no defines tu periodo'
    : mode === 'term'
      ? `${term.name} · ${formatRange(term.startsOn, term.endsOn)}`
      : `Empiezas el ${formatDayMonth(term.startsOn)}${term.prepProject ? ` · ${term.prepProject.name}` : ''}`

  function failed(message: string | undefined, fallback: string) {
    toast.show({ message: message ?? fallback, icon: 'info' })
  }

  function handleTogglePrep(item: PrepItem) {
    startTransition(async () => {
      const result = await setPrepItemDoneAction(item.id, !item.done)
      if (!result.ok) failed(result.message, 'No se pudo guardar el cambio.')
    })
  }

  function handleToggleAssignment(assignment: Assignment) {
    startTransition(async () => {
      const result = await setAssignmentDoneAction(
        assignment.id,
        !assignment.done,
      )
      if (!result.ok) failed(result.message, 'No se pudo guardar el cambio.')
    })
  }

  function handleDeleteSubject(subject: Subject) {
    startTransition(async () => {
      const result = await deleteSubjectAction(subject.id)
      if (!result.ok) {
        failed(result.message, 'No se pudo borrar la materia.')
        return
      }
      toast.show({ message: `${subject.name} se borró.`, icon: 'trash' })
    })
  }

  // Devuelve si se guardó: la casilla vuelve a su valor anterior si no.
  async function handleSaveGrade(
    subject: Subject,
    field: GradeField,
    value: number | null,
  ): Promise<boolean> {
    const result = await setGradeAction(subject.id, field, value)
    if (!result.ok) failed(result.message, 'No se pudo guardar la calificación.')
    return result.ok
  }

  return (
    <div className={styles.page}>
      <SchoolHeader
        mode={mode}
        onModeChange={setMode}
        subtitle={subtitle}
        hasTerm={term !== null}
        onEditTerm={() => setTermDrawerOpen(true)}
        onNewSubject={() => setSubjectDrawerOpen(true)}
      />

      {mode === 'prep' ? (
        <PrepView
          term={term}
          daysLeft={daysLeft}
          items={prepItems}
          goalLabel={goalLabel}
          onTogglePrep={handleTogglePrep}
          onSeeTerm={() => setMode('term')}
          onDefineTerm={() => setTermDrawerOpen(true)}
        />
      ) : (
        <div className={styles.term}>
          <TermTabs tab={tab} onChange={setTab} />
          {tab === 'schedule' ? <ScheduleGrid subjects={subjects} /> : null}
          {tab === 'subjects' ? (
            <SubjectsGrid
              subjects={subjects}
              assignments={assignments}
              onDelete={handleDeleteSubject}
              onNewSubject={() => setSubjectDrawerOpen(true)}
            />
          ) : null}
          {tab === 'assignments' ? (
            <AssignmentsList
              assignments={assignments}
              subjects={subjects}
              today={today}
              onToggle={handleToggleAssignment}
            />
          ) : null}
          {tab === 'grades' ? (
            <GradesTable subjects={subjects} onSave={handleSaveGrade} />
          ) : null}
        </div>
      )}

      <SubjectDrawer
        open={subjectDrawerOpen}
        termId={term?.id ?? null}
        onClose={() => setSubjectDrawerOpen(false)}
        onCreated={() => setSubjectDrawerOpen(false)}
      />

      <TermDrawer
        open={termDrawerOpen}
        term={term}
        projectOptions={projectOptions}
        onClose={() => setTermDrawerOpen(false)}
        onSaved={() => setTermDrawerOpen(false)}
      />
    </div>
  )
}
