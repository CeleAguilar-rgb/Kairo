'use client'

import {
  SUBJECT_COLORS,
  WEEKDAYS,
  createSubjectSchema,
  type CreateSubjectInput,
} from '@kairo/shared'
import { useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { fieldErrors } from '@/lib/form-errors'

import { createSubjectAction } from '../actions'
import { SUBJECT_COLOR_LABEL, WEEKDAY_LABEL, WEEKDAY_SHORT } from '../types'

import colors from './SchoolColors.module.css'
import styles from './SubjectDrawer.module.css'

type SubjectDrawerProps = {
  open: boolean
  // El periodo al que va la materia (el que se muestra); null si todavía no hay uno.
  termId: string | null
  onClose: () => void
  onCreated: () => void
}

export function SubjectDrawer({
  open,
  termId,
  onClose,
  onCreated,
}: SubjectDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nueva materia"
      hideTitle
      width="lg"
    >
      {/* Aparte, para que al abrir vuelva a empezar vacío (Drawer desmonta al cerrarse). */}
      <SubjectForm termId={termId} onClose={onClose} onCreated={onCreated} />
    </Drawer>
  )
}

function SubjectForm({
  termId,
  onClose,
  onCreated,
}: Omit<SubjectDrawerProps, 'open'>) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [teacher, setTeacher] = useState('')
  const [days, setDays] = useState<CreateSubjectInput['days']>(['mon', 'wed'])
  const [startsAt, setStartsAt] = useState('19:00')
  const [endsAt, setEndsAt] = useState('21:00')
  const [room, setRoom] = useState('En línea')
  const [color, setColor] = useState<CreateSubjectInput['color']>('lavender')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function toggleDay(day: CreateSubjectInput['days'][number]) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day],
    )
    if (errors.days) setErrors((current) => ({ ...current, days: '' }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return

    const candidate = {
      name,
      teacher: teacher.trim() || null,
      days,
      startsAt,
      endsAt,
      room,
      color,
    }
    const parsed = createSubjectSchema.safeParse(candidate)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues))
      return
    }
    setErrors({})

    startTransition(async () => {
      const result = await createSubjectAction(parsed.data, termId)
      if (!result.ok) {
        setErrors(result.errors)
        toast.show({
          message: result.message ?? 'Revisa los campos marcados.',
          icon: 'info',
        })
        return
      }
      toast.show({ message: 'Materia creada.', icon: 'check' })
      onCreated()
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <header className={styles.head}>
        <p className={styles.heading} aria-hidden="true">
          Nueva materia
        </p>
        <button
          type="button"
          className={styles.close}
          aria-label="Cerrar sin guardar"
          onClick={onClose}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className={styles.fields}>
        <Input
          id="subject-name"
          label="Nombre"
          value={name}
          maxLength={80}
          autoFocus
          error={errors.name}
          onChange={(event) => {
            setName(event.target.value)
            if (errors.name) setErrors((current) => ({ ...current, name: '' }))
          }}
          onBlur={() => {
            if (!name.trim())
              setErrors((current) => ({
                ...current,
                name: 'Escribe el nombre de la materia.',
              }))
          }}
        />

        <Input
          id="subject-teacher"
          label="Profesor (opcional)"
          value={teacher}
          maxLength={80}
          onChange={(event) => setTeacher(event.target.value)}
        />

        <div className={styles.field}>
          <span className={styles.label} id="subject-days-label">
            Días de clase
          </span>
          <div
            role="group"
            aria-labelledby="subject-days-label"
            className={styles.days}
          >
            {WEEKDAYS.map((day) => {
              const on = days.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  aria-label={WEEKDAY_LABEL[day]}
                  className={on ? styles.daySelected : styles.day}
                  onClick={() => toggleDay(day)}
                >
                  {WEEKDAY_SHORT[day]}
                </button>
              )
            })}
          </div>
          {errors.days ? (
            <span className={styles.error} role="alert">
              {errors.days}
            </span>
          ) : null}
        </div>

        <div className={styles.timeRow}>
          <Input
            id="subject-starts"
            label="Empieza"
            type="time"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <span className={styles.timeDash} aria-hidden="true">
            –
          </span>
          <Input
            id="subject-ends"
            label="Termina"
            type="time"
            value={endsAt}
            error={errors.endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </div>

        <Input
          id="subject-room"
          label="Salón o enlace"
          value={room}
          onChange={(event) => setRoom(event.target.value)}
        />

        <div className={styles.field}>
          <span className={styles.label} id="subject-color-label">
            Color
          </span>
          <div
            role="radiogroup"
            aria-labelledby="subject-color-label"
            className={styles.colors}
          >
            {SUBJECT_COLORS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={color === key}
                aria-label={SUBJECT_COLOR_LABEL[key]}
                className={[
                  styles.swatch,
                  colors[`subject_${key}`],
                  color === key ? styles.swatchSelected : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setColor(key)}
              />
            ))}
          </div>
        </div>

        <span className={styles.hint}>
          Se crea como proyecto de tipo Escuela: sus entregas son tareas y sus
          clases, eventos que se repiten.
        </span>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit}>
          Crear materia
        </Button>
      </div>
    </form>
  )
}
