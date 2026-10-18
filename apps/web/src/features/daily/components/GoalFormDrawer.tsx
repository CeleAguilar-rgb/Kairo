'use client'

import { GOAL_AREAS, GOAL_KINDS, goalSchema, type GoalArea, type GoalKind } from '@kairo/shared'
import { useState, useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { fieldErrors } from '@/lib/form-errors'

import { saveGoalAction } from '../goal-actions'
import { parseGoalTarget } from '../goal-utils'
import { GOAL_AREA_LABEL, GOAL_KIND_DESCRIPTION, GOAL_KIND_LABEL } from '../routine-meta'
import type { Goal } from '../types'

import styles from './GoalFormDrawer.module.css'

type Option = { value: string; label: string }

type GoalFormDrawerProps = {
  open: boolean
  // La meta que se edita; null = meta nueva.
  goal: Goal | null
  habitBlocks: Option[]
  projects: Option[]
  onClose: () => void
  // Se guardó: la pantalla abre el detalle de esa meta.
  onSaved: (id: string, isNew: boolean) => void
}

export function GoalFormDrawer({ open, goal, ...rest }: GoalFormDrawerProps) {
  return (
    <Drawer open={open} onClose={rest.onClose} title={goal ? 'Editar meta' : 'Nueva meta'} hideTitle width="lg">
      {/* El formulario es un componente aparte a propósito: Drawer lo desmonta al cerrarse, así cada vez
          que se abre empieza vacío (o con la meta que se edita) sin limpiarlo a mano. */}
      <GoalForm key={goal?.id ?? 'new'} goal={goal} {...rest} />
    </Drawer>
  )
}

type FormProps = Omit<GoalFormDrawerProps, 'open'>

// "12 libros", "$10,000": cómo se vuelve a escribir la cantidad de una meta de tipo Número al editarla.
function targetText(goal: Goal | null): string {
  if (!goal || goal.kind !== 'number') return ''
  const value = goal.target.toLocaleString('es-MX')
  return goal.unit === '$' ? `$${value}` : goal.unit ? `${value} ${goal.unit}` : value
}

function GoalForm({ goal, habitBlocks, projects, onClose, onSaved }: FormProps) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const editing = goal !== null

  const [title, setTitle] = useState(goal?.title ?? '')
  const [area, setArea] = useState<GoalArea>(goal?.area ?? 'personal')
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? 'number')
  const [target, setTarget] = useState(targetText(goal))
  const [blockId, setBlockId] = useState(goal?.blockId ?? habitBlocks[0]?.value ?? '')
  const [projectId, setProjectId] = useState(goal?.projectId ?? projects[0]?.value ?? '')
  const [dueOn, setDueOn] = useState(goal?.dueOn ?? '')
  const [why, setWhy] = useState(goal?.why ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // El error de un campo se quita en cuanto se toca: nada de seguir regañando.
  const clearError = (field: string) => setErrors((current) => (current[field] ? { ...current, [field]: '' } : current))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsedTarget = parseGoalTarget(target)
    const parsed = goalSchema.safeParse({
      title,
      area,
      kind,
      target: kind === 'number' ? parsedTarget.target : null,
      unit: kind === 'number' ? parsedTarget.unit : '',
      blockId: kind === 'habit' ? blockId || null : null,
      projectId: kind === 'project' ? projectId || null : null,
      dueOn: dueOn || null,
      why,
    })
    if (!parsed.success) {
      const found = fieldErrors(parsed.error.issues)
      setErrors(found)
      const first = ['title', 'target', 'blockId', 'projectId'].find((key) => found[key])
      if (first) document.getElementById(`goal-${first}`)?.focus()
      return
    }
    startTransition(async () => {
      const result = await saveGoalAction(goal?.id ?? null, parsed.data)
      if (!result.ok) {
        setErrors(result.errors)
        if (result.message) toast.show({ message: result.message, icon: 'info' })
        return
      }
      toast.show({ message: editing ? 'Meta actualizada.' : 'Meta creada.', icon: 'check' })
      onSaved(result.id ?? '', !editing)
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <header className={styles.head}>
        {/* El título real (para lectores de pantalla) lo pone el Drawer; este es solo visual */}
        <p className={styles.heading} aria-hidden="true">
          {editing ? 'Editar meta' : 'Nueva meta'}
        </p>
        <button type="button" className={styles.close} aria-label="Cerrar sin guardar" onClick={onClose}>
          <LineIcon d="M6 6l12 12M18 6L6 18" size={20} />
        </button>
      </header>

      <div className={styles.fields}>
        <Input
          id="goal-title"
          label="Título"
          value={title}
          maxLength={120}
          autoComplete="off"
          autoFocus
          className={styles.titleInput}
          error={errors.title || undefined}
          onChange={(event) => {
            setTitle(event.target.value)
            if (event.target.value.trim()) clearError('title')
          }}
        />

        <div className={styles.field}>
          <span className={styles.label}>Área</span>
          <Segmented
            label="Área"
            mode="radio"
            tone="raised"
            value={area}
            onChange={setArea}
            options={GOAL_AREAS.map((value) => ({ value, label: GOAL_AREA_LABEL[value] }))}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label} id="goal-kind-label">
            Cómo se mide
          </span>
          <div role="radiogroup" aria-labelledby="goal-kind-label" className={styles.kinds}>
            {GOAL_KINDS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={kind === value}
                // El tipo no se cambia al editar: el avance que ya tiene no tendría sentido en otro tipo.
                disabled={editing && kind !== value}
                className={[styles.kind, kind === value ? styles.kindOn : null].filter(Boolean).join(' ')}
                onClick={() => setKind(value)}
              >
                <span className={styles.kindName}>{GOAL_KIND_LABEL[value]}</span>
                <span className={styles.kindDescription}>{GOAL_KIND_DESCRIPTION[value]}</span>
              </button>
            ))}
          </div>
        </div>

        {kind === 'number' ? (
          <Input
            id="goal-target"
            label="Meta"
            value={target}
            autoComplete="off"
            placeholder="Ej. 12 libros"
            hint="La cantidad y, si quieres, su unidad: “12 libros”, “50,000 palabras”."
            error={errors.target}
            onChange={(event) => {
              setTarget(event.target.value)
              clearError('target')
            }}
          />
        ) : null}

        {kind === 'habit' ? (
          habitBlocks.length > 0 ? (
            <Select
              id="goal-blockId"
              label="Bloque de rutina"
              value={blockId}
              onChange={(event) => {
                setBlockId(event.target.value)
                clearError('blockId')
              }}
              options={habitBlocks}
            />
          ) : (
            <p className={styles.note}>Para ligar un hábito necesitas un bloque de hábito en tu rutina.</p>
          )
        ) : null}
        {kind === 'habit' && errors.blockId ? <span className={styles.error}>{errors.blockId}</span> : null}

        {kind === 'project' ? (
          projects.length > 0 ? (
            <Select id="goal-projectId" label="Proyecto" value={projectId} onChange={(event) => {
                setProjectId(event.target.value)
                clearError('projectId')
              }}
              options={projects}
            />
          ) : (
            <p className={styles.note}>Todavía no tienes proyectos activos para ligar.</p>
          )
        ) : null}
        {kind === 'project' && errors.projectId ? <span className={styles.error}>{errors.projectId}</span> : null}
        {kind === 'habit' && habitBlocks.length > 0 ? <span className={styles.hint}>El avance sale solo de tu reporte.</span> : null}

        <Input
          id="goal-due"
          type="date"
          label="Fecha meta"
          labelExtra={<span className={styles.optional}>(opcional)</span>}
          value={dueOn}
          onChange={(event) => setDueOn(event.target.value)}
        />

        <Input
          id="goal-why"
          label="Por qué la quieres"
          value={why}
          maxLength={160}
          autoComplete="off"
          hint="Sale en la tarjeta para recordarte cuando te atores."
          onChange={(event) => setWhy(event.target.value)}
        />
      </div>

      <footer className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit} disabled={pending}>
          {editing ? 'Guardar cambios' : 'Crear meta'}
        </Button>
      </footer>
    </form>
  )
}
