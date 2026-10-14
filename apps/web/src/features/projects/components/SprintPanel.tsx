'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Textarea } from '@/components/ui/Textarea'

import type { CloseOptions } from '../sprint-utils'

import styles from './SprintPanel.module.css'

type Weeks = '1' | '2'

const WEEK_OPTIONS = [
  { value: '1' as const, label: '1 semana' },
  { value: '2' as const, label: '2 semanas' },
]

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

type CloseSprintDrawerProps = {
  open: boolean
  sprintNumber: number
  doneCount: number
  openCount: number
  onClose: () => void
  onConfirm: (options: CloseOptions) => void
}

// Panel "Cerrar Sprint N" (ProyectoSprints.dc.html): cuántas se hicieron, qué hacer con las que
// faltan, cuánto dura el siguiente y las notas. El formulario es un componente aparte a
// propósito: Drawer lo desmonta al cerrarse, así cada vez que se abre empieza limpio.
export function CloseSprintDrawer({ open, sprintNumber, doneCount, openCount, onClose, onConfirm }: CloseSprintDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title={`Cerrar Sprint ${sprintNumber}`} hideTitle>
      <CloseForm sprintNumber={sprintNumber} doneCount={doneCount} openCount={openCount} onClose={onClose} onConfirm={onConfirm} />
    </Drawer>
  )
}

function CloseForm({ sprintNumber, doneCount, openCount, onClose, onConfirm }: Omit<CloseSprintDrawerProps, 'open'>) {
  const [move, setMove] = useState<CloseOptions['move']>('next')
  const [weeks, setWeeks] = useState<Weeks>('2')
  const [nextGoal, setNextGoal] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onConfirm({ move, weeks: weeks === '1' ? 1 : 2, notes, nextGoal })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Cerrar Sprint {sprintNumber}</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar panel">
          <CloseIcon />
        </button>
      </div>

      <div className={styles.fields}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{doneCount}</span>
            <span className={styles.statLabel}>{doneCount === 1 ? 'hecha' : 'hechas'}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{openCount}</span>
            <span className={styles.statLabel}>sin terminar</span>
          </div>
        </div>

        {openCount > 0 ? (
          <fieldset className={styles.fieldset}>
            <legend className={styles.label}>¿Qué hago con las que faltan?</legend>
            {(
              [
                { value: 'next', label: 'Pasarlas al siguiente sprint', hint: 'Empiezan en Por hacer.' },
                { value: 'back', label: 'Regresarlas al backlog', hint: 'Las eliges después con calma.' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={move === option.value}
                className={[styles.option, move === option.value ? styles.optionOn : null].filter(Boolean).join(' ')}
                onClick={() => setMove(option.value)}
              >
                <span className={styles.radio} aria-hidden="true" />
                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>{option.label}</span>
                  <span className={styles.hint}>{option.hint}</span>
                </span>
              </button>
            ))}
          </fieldset>
        ) : null}

        <div className={styles.field}>
          <span className={styles.label} id="next-duration">
            Duración del siguiente
          </span>
          <div className={styles.segmentedWrap}>
            <Segmented label="Duración del siguiente sprint" mode="radio" tone="raised" value={weeks} onChange={setWeeks} options={WEEK_OPTIONS} />
          </div>
        </div>

        <Input
          id="next-goal"
          label="Meta del siguiente sprint"
          labelExtra={<span className={styles.optional}>(opcional)</span>}
          value={nextGoal}
          maxLength={200}
          placeholder="Qué quieres lograr en el Sprint"
          onChange={(event) => setNextGoal(event.target.value)}
        />

        <Textarea
          id="sprint-notes"
          label="Notas del sprint"
          rows={4}
          maxLength={2000}
          placeholder="Qué salió bien y qué cambiarías"
          hint="Opcional. Se guarda en Sprints cerrados."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <footer className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit}>
          Cerrar y empezar el Sprint {sprintNumber + 1}
        </Button>
      </footer>
    </form>
  )
}

type StartSprintDrawerProps = {
  open: boolean
  sprintNumber: number
  onClose: () => void
  onConfirm: (options: { goal: string; weeks: 1 | 2 }) => void
}

// Panel "Empezar Sprint N": para un proyecto que todavía no tiene sprint activo. No está en el
// canvas (que siempre muestra uno activo): usa los mismos campos que el de cerrar.
export function StartSprintDrawer({ open, sprintNumber, onClose, onConfirm }: StartSprintDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title={`Empezar Sprint ${sprintNumber}`} hideTitle>
      <StartForm sprintNumber={sprintNumber} onClose={onClose} onConfirm={onConfirm} />
    </Drawer>
  )
}

function StartForm({ sprintNumber, onClose, onConfirm }: Omit<StartSprintDrawerProps, 'open'>) {
  const [goal, setGoal] = useState('')
  const [weeks, setWeeks] = useState<Weeks>('2')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onConfirm({ goal, weeks: weeks === '1' ? 1 : 2 })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Empezar Sprint {sprintNumber}</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar panel">
          <CloseIcon />
        </button>
      </div>

      <div className={styles.fields}>
        <Input
          id="start-goal"
          label="Meta del sprint"
          labelExtra={<span className={styles.optional}>(opcional)</span>}
          value={goal}
          maxLength={200}
          placeholder="Qué quieres lograr en este sprint"
          onChange={(event) => setGoal(event.target.value)}
        />
        <div className={styles.field}>
          <span className={styles.label}>Duración</span>
          <div className={styles.segmentedWrap}>
            <Segmented label="Duración del sprint" mode="radio" tone="raised" value={weeks} onChange={setWeeks} options={WEEK_OPTIONS} />
          </div>
        </div>
        <p className={styles.hint}>Empieza hoy. Después agregas tareas desde el backlog.</p>
      </div>

      <footer className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit}>
          Empezar Sprint {sprintNumber}
        </Button>
      </footer>
    </form>
  )
}
