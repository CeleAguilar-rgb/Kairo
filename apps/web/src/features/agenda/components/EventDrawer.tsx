'use client'

import { EVENT_KINDS, EVENT_REMINDERS, EVENT_REPEATS, eventSchema, type EventInput } from '@kairo/shared'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { fieldErrors } from '@/lib/form-errors'

import { meetingUrl } from '../agenda-utils'
import { EVENT_KIND_LABEL, EVENT_REMINDER_LABEL, EVENT_REMINDER_TEXT, EVENT_REPEAT_LABEL } from '../types'

import styles from './EventDrawer.module.css'

type EventDrawerProps = {
  open: boolean
  mode: 'create' | 'edit'
  // Con lo que abre el formulario: vacío (con la fecha y hora elegidas) o el evento que se edita.
  initial: EventInput
  projects: { id: string; name: string }[]
  // Un envío en curso: el botón avisa y no deja mandar otro.
  pending: boolean
  // Los errores que devolvió el servidor, por campo
  serverErrors: Record<string, string>
  onClose: () => void
  onSubmit: (input: EventInput) => void
}

// Panel "Nuevo evento" / "Editar evento" (EventoNuevo.dc.html). El formulario es un componente aparte
// a propósito: Drawer lo desmonta al cerrarse, así cada vez que se abre empieza limpio.
export function EventDrawer({ open, mode, initial, projects, pending, serverErrors, onClose, onSubmit }: EventDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title={mode === 'edit' ? 'Editar evento' : 'Nuevo evento'} hideTitle width="lg">
      <EventForm mode={mode} initial={initial} projects={projects} pending={pending} serverErrors={serverErrors} onClose={onClose} onSubmit={onSubmit} />
    </Drawer>
  )
}

type FormProps = Omit<EventDrawerProps, 'open'>

// Los campos en el orden del canvas; el foco va al primero que tenga error.
const FIELD_ID: Record<string, string> = {
  title: 'event-title',
  date: 'event-date',
  startTime: 'event-start',
  endTime: 'event-end',
  location: 'event-location',
  notes: 'event-notes',
}

function EventForm({ mode, initial, projects, pending, serverErrors, onClose, onSubmit }: FormProps) {
  const [title, setTitle] = useState(initial.title)
  const [kind, setKind] = useState(initial.kind)
  const [date, setDate] = useState(initial.date)
  const [allDay, setAllDay] = useState(initial.allDay)
  const [startTime, setStartTime] = useState(initial.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(initial.endTime ?? '10:00')
  const [location, setLocation] = useState(initial.location ?? '')
  const [projectId, setProjectId] = useState(initial.projectId ?? '')
  const [repeat, setRepeat] = useState(initial.repeat)
  const [reminder, setReminder] = useState(initial.reminder)
  const [notes, setNotes] = useState(initial.notes)
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const errors = { ...serverErrors, ...localErrors }

  const clear = (key: string) =>
    setLocalErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    const parsed = eventSchema.safeParse({
      title,
      kind,
      date,
      allDay,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      location: location.trim() || null,
      projectId: projectId || null,
      repeat,
      reminder,
      notes,
    })
    if (!parsed.success) {
      const found = fieldErrors(parsed.error.issues)
      setLocalErrors(found)
      const first = Object.keys(found)[0]
      document.getElementById(FIELD_ID[first] ?? '')?.focus()
      return
    }
    setLocalErrors({})
    onSubmit(parsed.data)
  }

  const isCall = meetingUrl(location) !== null

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.head}>
        <h2 className={styles.heading}>{mode === 'edit' ? 'Editar evento' : 'Nuevo evento'}</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar sin guardar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className={styles.fields}>
        <Input
          id="event-title"
          label="Título"
          className={styles.titleInput}
          value={title}
          maxLength={120}
          placeholder="Por ejemplo: Llamada con la universidad"
          error={errors.title}
          onChange={(event) => {
            setTitle(event.target.value)
            clear('title')
          }}
        />

        <div className={styles.field}>
          <span className={styles.label}>Tipo</span>
          <div className={styles.segmentedWrap}>
            <Segmented
              label="Tipo de evento"
              mode="radio"
              tone="raised"
              value={kind}
              onChange={setKind}
              options={EVENT_KINDS.map((value) => ({ value, label: EVENT_KIND_LABEL[value] }))}
            />
          </div>
        </div>

        <Input
          id="event-date"
          label="Fecha"
          type="date"
          value={date}
          error={errors.date}
          onChange={(event) => {
            setDate(event.target.value)
            clear('date')
          }}
        />

        <div className={styles.toggleRow}>
          <Toggle checked={allDay} onToggle={() => setAllDay((value) => !value)} label="Todo el día" />
          <span>Todo el día</span>
        </div>

        {allDay ? null : (
          <div className={styles.times}>
            <Input
              id="event-start"
              label="Empieza"
              type="time"
              value={startTime}
              error={errors.startTime}
              onChange={(event) => {
                setStartTime(event.target.value)
                clear('startTime')
                clear('endTime')
              }}
            />
            <span className={styles.dash} aria-hidden="true">
              –
            </span>
            <Input
              id="event-end"
              label="Termina"
              type="time"
              value={endTime}
              error={errors.endTime}
              onChange={(event) => {
                setEndTime(event.target.value)
                clear('endTime')
              }}
            />
          </div>
        )}

        <Input
          id="event-location"
          label="Lugar o enlace"
          labelExtra={<span className={styles.optional}>(opcional)</span>}
          value={location}
          maxLength={200}
          placeholder="Una dirección o el enlace de la llamada"
          hint={isCall ? 'Es una llamada: en el detalle verás el botón "Unirme a la llamada".' : undefined}
          error={errors.location}
          onChange={(event) => {
            setLocation(event.target.value)
            clear('location')
          }}
        />

        <Select
          id="event-project"
          label="Proyecto (opcional)"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          options={[{ value: '', label: 'Sin proyecto' }, ...projects.map((project) => ({ value: project.id, label: project.name }))]}
        />

        <Select
          id="event-repeat"
          label="Repetir"
          value={repeat}
          onChange={(event) => setRepeat(event.target.value as typeof repeat)}
          options={EVENT_REPEATS.map((value) => ({ value, label: EVENT_REPEAT_LABEL[value] }))}
        />

        <div className={styles.field}>
          <span className={styles.label}>Aviso</span>
          <div className={styles.segmentedWrap}>
            <Segmented
              label="Aviso antes del evento"
              mode="radio"
              tone="raised"
              value={reminder}
              onChange={setReminder}
              options={EVENT_REMINDERS.map((value) => ({ value, label: EVENT_REMINDER_LABEL[value] }))}
            />
          </div>
          {reminder === 'none' ? null : <span className={styles.hint}>Te llegará un recordatorio {EVENT_REMINDER_TEXT[reminder]}.</span>}
        </div>

        <Textarea
          id="event-notes"
          label="Notas"
          rows={3}
          maxLength={2000}
          error={errors.notes}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value)
            clear('notes')
          }}
        />

        {errors.form ? <p className={styles.formError}>{errors.form}</p> : null}
      </div>

      <footer className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit} disabled={pending}>
          {pending ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Crear evento'}
        </Button>
      </footer>
    </form>
  )
}
