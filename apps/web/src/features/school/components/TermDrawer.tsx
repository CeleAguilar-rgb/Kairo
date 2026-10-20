'use client'

import { termSchema } from '@kairo/shared'
import { useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { fieldErrors } from '@/lib/form-errors'

import { saveTermAction } from '../actions'
import type { ProjectRef, Term } from '../types'

// Mismo cajón que "Nueva materia": encabezado, campos con scroll y botones fijos.
import styles from './SubjectDrawer.module.css'

type TermDrawerProps = {
  open: boolean
  // El periodo que se muestra; null si todavía no hay ninguno.
  term: Term | null
  // Los proyectos entre los que se elige el de preparación.
  projectOptions: ProjectRef[]
  onClose: () => void
  onSaved: () => void
}

// "Periodo" no está en el canvas: sin él no habría dónde poner cuándo empieza el cuatrimestre (de ahí sale la
// cuenta regresiva de "Antes de empezar") ni cuál proyecto es la lista de preparación.
export function TermDrawer({
  open,
  term,
  projectOptions,
  onClose,
  onSaved,
}: TermDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Periodo"
      hideTitle
      width="lg"
    >
      {/* Aparte, para que al abrir vuelva a empezar con los datos del periodo (Drawer desmonta al cerrarse). */}
      <TermForm
        term={term}
        projectOptions={projectOptions}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Drawer>
  )
}

function TermForm({
  term,
  projectOptions,
  onClose,
  onSaved,
}: Omit<TermDrawerProps, 'open'>) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  // Editar el periodo que hay, o empezar uno nuevo (el siguiente cuatrimestre) con los campos vacíos.
  const [editing, setEditing] = useState(term !== null)
  const [name, setName] = useState(term?.name ?? '')
  const [startsOn, setStartsOn] = useState(term?.startsOn ?? '')
  const [endsOn, setEndsOn] = useState(term?.endsOn ?? '')
  const [prepProjectId, setPrepProjectId] = useState(
    term?.prepProject?.id ?? '',
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function startNew() {
    setEditing(false)
    setName('')
    setStartsOn('')
    setEndsOn('')
    setPrepProjectId('')
    setErrors({})
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return

    const parsed = termSchema.safeParse({
      name,
      startsOn,
      endsOn,
      prepProjectId: prepProjectId || null,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues))
      return
    }
    setErrors({})

    startTransition(async () => {
      const result = await saveTermAction(
        editing && term ? term.id : null,
        parsed.data,
      )
      if (!result.ok) {
        setErrors(result.errors)
        toast.show({
          message: result.message ?? 'Revisa los campos marcados.',
          icon: 'info',
        })
        return
      }
      toast.show({ message: 'Periodo guardado.', icon: 'check' })
      onSaved()
    })
  }

  const heading = editing ? 'Periodo' : 'Nuevo periodo'

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <header className={styles.head}>
        <p className={styles.heading} aria-hidden="true">
          {heading}
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
          id="term-name"
          label="Nombre"
          value={name}
          maxLength={80}
          autoFocus
          placeholder="Ingeniería en Software · 1er cuatrimestre"
          error={errors.name}
          onChange={(event) => {
            setName(event.target.value)
            if (errors.name) setErrors((current) => ({ ...current, name: '' }))
          }}
          onBlur={() => {
            if (!name.trim())
              setErrors((current) => ({
                ...current,
                name: 'Escribe el nombre del periodo.',
              }))
          }}
        />

        <div className={styles.timeRow}>
          <Input
            id="term-starts"
            label="Empieza"
            type="date"
            value={startsOn}
            error={errors.startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
          />
          <span className={styles.timeDash} aria-hidden="true">
            –
          </span>
          <Input
            id="term-ends"
            label="Termina"
            type="date"
            value={endsOn}
            error={errors.endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <Select
            id="term-prep-project"
            label="Proyecto de preparación (opcional)"
            value={prepProjectId}
            onChange={(event) => setPrepProjectId(event.target.value)}
            options={[
              { value: '', label: 'Ninguno' },
              ...projectOptions.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />
          {errors.prepProjectId ? (
            <span className={styles.error} role="alert">
              {errors.prepProjectId}
            </span>
          ) : null}
        </div>

        <span className={styles.hint}>
          Las tareas de ese proyecto son la lista de &ldquo;Antes de
          empezar&rdquo;. Las clases de las materias que agregues empiezan con
          el periodo y terminan con él.
        </span>

        {editing ? (
          <div>
            <Button variant="ghost" onClick={startNew}>
              Empezar un periodo nuevo
            </Button>
          </div>
        ) : null}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit}>
          {editing ? 'Guardar periodo' : 'Crear periodo'}
        </Button>
      </div>
    </form>
  )
}
