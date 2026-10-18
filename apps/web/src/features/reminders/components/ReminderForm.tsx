'use client'

import { REMINDER_REPEATS, createReminderSchema, type CreateReminderInput } from '@kairo/shared'
import { motion } from 'motion/react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { fieldErrors } from '@/lib/form-errors'
import { EASE_OUT } from '@/lib/motion'

import { isInPast } from '../reminder-utils'
import { REMINDER_REPEAT_LABEL } from '../types'

import styles from './ReminderForm.module.css'

type ReminderFormProps = {
  // Con lo que abre el formulario: el día de hoy y la próxima media hora.
  initial: CreateReminderInput
  timeZone: string
  // Un envío en curso: el botón avisa y no deja mandar otro.
  pending: boolean
  // Los errores que devolvió el servidor, por campo
  serverErrors: Record<string, string>
  onCancel: () => void
  onSubmit: (input: CreateReminderInput) => void
}

// Los campos en el orden del canvas; el foco va al primero que tenga error.
const FIELD_ID: Record<string, string> = {
  title: 'reminder-title',
  date: 'reminder-date',
  time: 'reminder-time',
}

// Formulario "Nuevo" de Recordatorios (Recordatorios.dc.html): mensaje, día, hora y repetir. Vive dentro
// de la tarjeta de "Para hoy" y se monta solo mientras está abierto, así cada vez empieza limpio.
export function ReminderForm({ initial, timeZone, pending, serverErrors, onCancel, onSubmit }: ReminderFormProps) {
  const [title, setTitle] = useState(initial.title)
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [repeat, setRepeat] = useState(initial.repeat)
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const errors = { ...serverErrors, ...localErrors }

  // Al abrir, el cursor ya está en el mensaje.
  useEffect(() => {
    document.getElementById(FIELD_ID.title)?.focus()
  }, [])

  const clear = (...keys: string[]) =>
    setLocalErrors((current) => {
      if (!keys.some((key) => key in current)) return current
      const next = { ...current }
      for (const key of keys) delete next[key]
      return next
    })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    const parsed = createReminderSchema.safeParse({ title, date, time, repeat })
    const found: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error.issues)
    // Un recordatorio para una hora que ya pasó nunca avisaría: se avisa aquí, sin ir al servidor.
    if (parsed.success && isInPast(parsed.data.date, parsed.data.time, new Date().toISOString(), timeZone)) {
      found.time = 'Esa hora ya pasó. Elige una más adelante.'
    }
    if (!parsed.success || Object.keys(found).length > 0) {
      setLocalErrors(found)
      const first = Object.keys(found)[0]
      document.getElementById(FIELD_ID[first] ?? '')?.focus()
      return
    }
    setLocalErrors({})
    onSubmit(parsed.data)
  }

  return (
    <motion.form
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Nuevo recordatorio"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      {/* El relleno vive en un hijo: el formulario recorta su contenido mientras crece y el relleno animaría a saltos */}
      <div className={styles.inner}>
        <Input
          id={FIELD_ID.title}
          label="Mensaje"
          value={title}
          maxLength={120}
          placeholder="Por ejemplo: Llamar al dentista"
          error={errors.title}
          onChange={(event) => {
            setTitle(event.target.value)
            clear('title')
          }}
        />

        <div className={styles.dateTime}>
          <div className={styles.date}>
            <Input
              id={FIELD_ID.date}
              label="Día"
              type="date"
              value={date}
              error={errors.date}
              onChange={(event) => {
                setDate(event.target.value)
                clear('date', 'time')
              }}
            />
          </div>
          <div className={styles.time}>
            <Input
              id={FIELD_ID.time}
              label="Hora"
              type="time"
              value={time}
              error={errors.time}
              onChange={(event) => {
                setTime(event.target.value)
                clear('time')
              }}
            />
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Repetir</span>
          <div className={styles.segmentedWrap}>
            <Segmented
              label="Repetir"
              mode="radio"
              tone="raised"
              value={repeat}
              onChange={setRepeat}
              options={REMINDER_REPEATS.map((value) => ({ value, label: REMINDER_REPEAT_LABEL[value] }))}
            />
          </div>
        </div>

        {errors.form ? <p className={styles.formError}>{errors.form}</p> : null}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar recordatorio'}
          </Button>
        </div>
      </div>
    </motion.form>
  )
}
