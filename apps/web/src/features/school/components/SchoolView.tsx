'use client'

import { useState, useTransition } from 'react'

import { useToast } from '@/components/ui/Toast'

import {
  deleteSubjectAction,
  setAssignmentDoneAction,
  setPrepItemDoneAction,
} from '../actions'
import type {
  Assignment,
  PrepItem,
  SchoolMode,
  SchoolTab,
  Subject,
} from '../types'

import { AssignmentsList } from './AssignmentsList'
import { GradesTable } from './GradesTable'
import { PrepView } from './PrepView'
import { SchoolHeader } from './SchoolHeader'
import styles from './SchoolView.module.css'
import { ScheduleGrid } from './ScheduleGrid'
import { SubjectDrawer } from './SubjectDrawer'
import { SubjectsGrid } from './SubjectsGrid'
import { TermTabs } from './TermTabs'

type SchoolViewProps = {
  subjects: Subject[]
  assignments: Assignment[]
  prepItems: PrepItem[]
  prepDaysLeft: number
  today: string
}

// Escuela (Escuela.dc.html): dos "momentos" — Antes de empezar (cuenta
// regresiva y preparación) y Durante el semestre (horario, materias,
// entregas, calificaciones en pestañas). Es una sola pantalla con todo el
// estado de vista aquí mismo: a diferencia de Día a día o Proyectos, el
// canvas no le da una URL a cada pestaña.
export function SchoolView({
  subjects,
  assignments,
  prepItems,
  prepDaysLeft,
  today,
}: SchoolViewProps) {
  const toast = useToast()
  const [, startTransition] = useTransition()
  const [mode, setMode] = useState<SchoolMode>('term')
  const [tab, setTab] = useState<SchoolTab>('schedule')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const subtitle =
    mode === 'term'
      ? 'Ejemplo: Ingeniería en Software · 1er cuatrimestre · ene – abr 2027'
      : 'Empiezas en enero · ingeniería o maestría'

  function handleTogglePrep(item: PrepItem) {
    startTransition(async () => {
      await setPrepItemDoneAction(item.id, !item.done)
    })
  }

  function handleToggleAssignment(assignment: Assignment) {
    startTransition(async () => {
      await setAssignmentDoneAction(assignment.id, !assignment.done)
    })
  }

  function handleDeleteSubject(subject: Subject) {
    startTransition(async () => {
      const result = await deleteSubjectAction(subject.id)
      if (!result.ok) {
        toast.show({
          message: result.message ?? 'No se pudo borrar la materia.',
          icon: 'info',
        })
        return
      }
      toast.show({ message: `${subject.name} se borró.`, icon: 'trash' })
    })
  }

  return (
    <div className={styles.page}>
      <SchoolHeader
        mode={mode}
        onModeChange={setMode}
        subtitle={subtitle}
        onNewSubject={() => setDrawerOpen(true)}
      />

      {mode === 'prep' ? (
        <PrepView
          daysLeft={prepDaysLeft}
          items={prepItems}
          onTogglePrep={handleTogglePrep}
          onSeeTerm={() => setMode('term')}
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
              onNewSubject={() => setDrawerOpen(true)}
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
          {tab === 'grades' ? <GradesTable subjects={subjects} /> : null}
        </div>
      )}

      <SubjectDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => setDrawerOpen(false)}
      />
    </div>
  )
}
