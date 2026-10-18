'use client'

import {
  PROJECT_COVER_CHOICES,
  PROJECT_KINDS,
  PROJECT_STATUSES,
  projectLinkSchema,
  projectSchema,
  type ProjectCoverKey,
  type ProjectInput,
  type ProjectKind,
  type ProjectStatus,
} from '@kairo/shared'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type FormEvent, type KeyboardEvent } from 'react'

import { PageHeading } from '@/components/layout/PageHeading'
import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { EASE_OUT } from '@/lib/motion'

import { createProjectAction, updateProjectAction } from '../actions'
import { fieldErrors } from '@/lib/form-errors'
import { PROJECT_KIND_LABEL, PROJECT_STATUS_LABEL } from '../types'

import { ProjectCover } from './ProjectCover'
import styles from './ProjectForm.module.css'

type ProjectFormProps = {
  mode: 'create' | 'edit'
  // Solo al editar: el proyecto que se edita (para guardar y para volver a su detalle).
  projectId?: string
  initial: ProjectInput
  // Solo al editar: las tareas del proyecto, para la vista previa de la tarjeta.
  taskCounts?: { done: number; total: number }
}

const KIND_HINT: Record<ProjectKind, string> = {
  work: 'Lo de mi empleo y clientes',
  personal: 'Mis ideas y proyectos propios',
  school: 'Materias, entregas y trámites',
}

// El puntito de color de cada tipo, como el de las etiquetas de la galería.
const KIND_DOT: Record<ProjectKind, string> = {
  work: styles.dotWork,
  personal: styles.dotPersonal,
  school: styles.dotSchool,
}

const COVER_LABEL: Record<string, string> = {
  luna: 'Luna',
  tablero: 'Tablero',
  olas: 'Olas',
  estrella: 'Estrella',
}

// Cada tarjeta entra un poco después de la anterior, de arriba hacia abajo.
const enter = (position: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT, delay: 0.1 + position * 0.07 } },
})

// Los ids de los campos, para llevar el foco al primero con error.
const FIELD_ID: Record<string, string> = {
  name: 'project-name',
  description: 'project-description',
  startedOn: 'project-started',
  goalOn: 'project-goal',
  objectives: 'project-objective',
}

// El formulario de proyecto (ProyectoEditar.dc.html): crea o edita. Valida con el mismo esquema
// que vuelve a usar la acción de servidor (packages/shared): aquí para avisar en el momento,
// allá porque lo que llega del navegador nunca se da por bueno.
export function ProjectForm({ mode, projectId, initial, taskCounts }: ProjectFormProps) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState(initial.name)
  const [kind, setKind] = useState<ProjectKind>(initial.kind)
  const [status, setStatus] = useState<ProjectStatus>(initial.status)
  const [description, setDescription] = useState(initial.description)
  const [startedOn, setStartedOn] = useState(initial.startedOn ?? '')
  const [goalOn, setGoalOn] = useState(initial.goalOn ?? '')
  const [objectives, setObjectives] = useState(initial.objectives)
  const [newObjective, setNewObjective] = useState('')
  const [links, setLinks] = useState(initial.links)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const [cover, setCover] = useState<ProjectCoverKey | null>(initial.cover)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Las portadas elegibles; si el proyecto ya tiene una propia (uno de los de ejemplo), se ofrece también.
  const choices: ProjectCoverKey[] = [...PROJECT_COVER_CHOICES]
  if (initial.cover && !choices.includes(initial.cover)) choices.unshift(initial.cover)

  const clearError = (key: string) =>
    setErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })

  const addObjective = () => {
    const text = newObjective.trim()
    if (!text) return
    if (objectives.length >= 30) {
      toast.show({ message: 'Un proyecto puede tener hasta 30 objetivos.', icon: 'info' })
      return
    }
    setObjectives((list) => [...list, text.slice(0, 200)])
    setNewObjective('')
  }

  const handleObjectiveKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addObjective()
  }

  const addLink = () => {
    if (!linkTitle.trim() && !linkUrl.trim()) return
    const parsed = projectLinkSchema.safeParse({ title: linkTitle, url: linkUrl.trim() })
    if (!parsed.success) {
      setLinkError(Object.values(fieldErrors(parsed.error.issues))[0] ?? 'Revisa el enlace.')
      return
    }
    setLinks((list) => [...list, parsed.data])
    setLinkTitle('')
    setLinkUrl('')
    setLinkError('')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    // Con un envío en curso no se manda otro (doble clic o Enter repetido crearía el proyecto dos veces).
    if (pending) return
    const candidate = {
      name,
      kind,
      status,
      description,
      // Un campo de fecha vacío no es una fecha: es "sin fecha".
      startedOn: startedOn || null,
      goalOn: goalOn || null,
      objectives,
      links,
      cover,
    }
    const parsed = projectSchema.safeParse(candidate)
    if (!parsed.success) {
      const found = fieldErrors(parsed.error.issues)
      setErrors(found)
      const first = Object.keys(found)[0]
      document.getElementById(FIELD_ID[first.split('.')[0]] ?? '')?.focus()
      return
    }
    setErrors({})

    startTransition(async () => {
      const result =
        mode === 'edit' && projectId
          ? await updateProjectAction(projectId, parsed.data)
          : await createProjectAction(parsed.data)
      if (!result.ok) {
        setErrors(result.errors)
        toast.show({ message: result.message ?? 'Revisa los campos marcados.', icon: 'info' })
        return
      }
      toast.show({ message: mode === 'edit' ? 'Cambios guardados.' : 'Proyecto creado.', icon: 'check' })
      router.push(`/proyectos/${result.id}`)
    })
  }

  const title = mode === 'edit' ? 'Editar proyecto' : 'Nuevo proyecto'

  return (
    <main className={styles.main}>
      <section className={styles.header}>
        <nav aria-label="Ruta" className={styles.breadcrumb}>
          <Link href="/proyectos">Proyectos</Link> /{' '}
          {mode === 'edit' && projectId ? (
            <>
              <Link href={`/proyectos/${projectId}`}>{initial.name || 'Proyecto'}</Link> / Editar
            </>
          ) : (
            'Nuevo proyecto'
          )}
        </nav>
        <PageHeading title={title} squiggle={false} />
      </section>

      <form className={styles.layout} onSubmit={handleSubmit} noValidate>
        <div className={styles.column}>
          <motion.section {...enter(0)} className={styles.card} aria-labelledby="form-basics">
            <h2 id="form-basics" className={styles.cardTitle}>
              Lo básico
            </h2>
            <Input
              id="project-name"
              label="Nombre"
              className={styles.nameInput}
              value={name}
              maxLength={80}
              placeholder="Por ejemplo: Mi app de recetas"
              error={errors.name}
              onChange={(event) => {
                setName(event.target.value)
                clearError('name')
              }}
              onBlur={() => {
                if (!name.trim()) setErrors((current) => ({ ...current, name: 'Escribe un nombre para el proyecto.' }))
              }}
            />

            <div className={styles.field}>
              <span className={styles.label} id="label-kind">
                Tipo
              </span>
              <div role="radiogroup" aria-labelledby="label-kind" className={styles.kinds}>
                {PROJECT_KINDS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={kind === value}
                    className={[styles.kindCard, kind === value ? styles.kindSelected : null].filter(Boolean).join(' ')}
                    onClick={() => setKind(value)}
                  >
                    <span className={styles.kindTop}>
                      <span className={styles.kindName}>{PROJECT_KIND_LABEL[value]}</span>
                      <span className={[styles.dot, KIND_DOT[value]].join(' ')} aria-hidden="true" />
                    </span>
                    <span className={styles.kindHint}>{KIND_HINT[value]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label} id="label-status">
                Estado
              </span>
              <div className={styles.statusWrap}>
                <Segmented
                  label="Estado del proyecto"
                  mode="radio"
                  tone="raised"
                  value={status}
                  onChange={setStatus}
                  options={PROJECT_STATUSES.map((value) => ({ value, label: PROJECT_STATUS_LABEL[value] }))}
                />
              </div>
            </div>

            <Textarea
              id="project-description"
              label="De qué trata"
              rows={4}
              maxLength={500}
              hint="Una o dos frases. Aparece en la tarjeta de la galería."
              error={errors.description}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
                clearError('description')
              }}
            />
          </motion.section>

          <motion.section {...enter(1)} className={styles.card} aria-labelledby="form-objectives">
            <div className={styles.cardHead}>
              <h2 id="form-objectives" className={styles.cardTitle}>
                Objetivos
              </h2>
              <span className={styles.count}>{objectives.length === 1 ? '1 objetivo' : `${objectives.length} objetivos`}</span>
            </div>
            {objectives.length > 0 ? (
              <ul className={styles.items}>
                {objectives.map((text, index) => (
                  <li key={`${index}-${text}`} className={styles.item}>
                    <span className={styles.itemDot} aria-hidden="true" />
                    <span className={styles.itemText}>{text}</span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      aria-label={`Quitar objetivo: ${text}`}
                      onClick={() => setObjectives((list) => list.filter((_, position) => position !== index))}
                    >
                      <LineIcon d="M6 6l12 12M18 6L6 18" size={16} strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className={styles.addRow}>
              <Input
                id="project-objective"
                label="Nuevo objetivo"
                value={newObjective}
                maxLength={200}
                placeholder="Escribe un objetivo y presiona Agregar"
                onChange={(event) => setNewObjective(event.target.value)}
                onKeyDown={handleObjectiveKey}
              />
              <Button variant="ghost" onClick={addObjective}>
                Agregar
              </Button>
            </div>
          </motion.section>

          <motion.section {...enter(2)} className={styles.card} aria-labelledby="form-dates">
            <h2 id="form-dates" className={styles.cardTitle}>
              Fechas y enlaces
            </h2>
            <div className={styles.dates}>
              <Input
                id="project-started"
                label="Fecha de inicio"
                type="date"
                value={startedOn}
                error={errors.startedOn}
                onChange={(event) => {
                  setStartedOn(event.target.value)
                  clearError('startedOn')
                  clearError('goalOn')
                }}
              />
              <Input
                id="project-goal"
                label="Fecha meta"
                labelExtra={<span className={styles.optional}>(opcional)</span>}
                type="date"
                value={goalOn}
                min={startedOn || undefined}
                error={errors.goalOn}
                onChange={(event) => {
                  setGoalOn(event.target.value)
                  clearError('goalOn')
                }}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Enlaces</span>
              {links.length > 0 ? (
                <ul className={styles.items}>
                  {links.map((link, index) => (
                    <li key={`${index}-${link.url}`} className={styles.item}>
                      <span className={styles.itemDot} aria-hidden="true" />
                      <span className={styles.itemText}>
                        <span className={styles.linkTitle}>{link.title}</span>
                        <span className={styles.linkUrl}>{link.url}</span>
                      </span>
                      <button
                        type="button"
                        className={styles.removeButton}
                        aria-label={`Quitar enlace: ${link.title}`}
                        onClick={() => setLinks((list) => list.filter((_, position) => position !== index))}
                      >
                        <LineIcon d="M6 6l12 12M18 6L6 18" size={16} strokeWidth={2} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className={styles.linkInputs}>
                <Input
                  id="project-link-title"
                  label="Nombre del enlace"
                  value={linkTitle}
                  maxLength={80}
                  placeholder="Nombre, p. ej. Repositorio"
                  onChange={(event) => {
                    setLinkTitle(event.target.value)
                    setLinkError('')
                  }}
                />
                <Input
                  id="project-link-url"
                  label="Dirección del enlace"
                  type="url"
                  value={linkUrl}
                  placeholder="https://"
                  error={linkError || undefined}
                  onChange={(event) => {
                    setLinkUrl(event.target.value)
                    setLinkError('')
                  }}
                />
                <Button variant="ghost" onClick={addLink}>
                  Agregar
                </Button>
              </div>
            </div>
          </motion.section>
        </div>

        <aside className={styles.aside}>
          <motion.section {...enter(1)} className={styles.card} aria-labelledby="form-cover">
            <h2 id="form-cover" className={styles.cardTitle}>
              Portada
            </h2>
            <div role="radiogroup" aria-labelledby="form-cover" className={styles.covers}>
              {choices.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={cover === key}
                  aria-label={`Portada ${COVER_LABEL[key] ?? 'actual'}`}
                  className={[styles.coverButton, cover === key ? styles.coverSelected : null].filter(Boolean).join(' ')}
                  onClick={() => setCover(key)}
                >
                  <ProjectCover coverKey={key} className={styles.coverArt} />
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => toast.show({ message: 'Subir tu propia imagen de portada llega pronto.', icon: 'info' })}
            >
              <LineIcon d="M12 16V4M7 9l5-5 5 5M4 20h16" size={16} />
              Subir mi imagen
            </Button>
          </motion.section>

          <motion.section {...enter(2)} className={styles.card} aria-labelledby="form-preview">
            <h2 id="form-preview" className={[styles.cardTitle, styles.previewTitle].join(' ')}>
              Así se verá en la galería
            </h2>
            <div className={styles.preview}>
              <div className={styles.previewCover}>
                {cover ? <ProjectCover coverKey={cover} className={styles.coverArt} /> : null}
                <span className={[styles.previewKind, styles[`previewKind_${kind}`]].join(' ')}>{PROJECT_KIND_LABEL[kind]}</span>
              </div>
              <div className={styles.previewBody}>
                <span className={styles.previewName}>{name.trim() || 'Sin nombre todavía'}</span>
                <span className={styles.previewDescription}>{description.trim() || 'Agrega de qué trata.'}</span>
                <span className={styles.previewMeta}>
                  {taskCounts && taskCounts.total > 0 ? `${taskCounts.done} de ${taskCounts.total} tareas` : '0 tareas'} ·{' '}
                  {PROJECT_STATUS_LABEL[status]}
                </span>
              </div>
            </div>
          </motion.section>

          <div className={styles.actions}>
            <Link href={mode === 'edit' && projectId ? `/proyectos/${projectId}` : '/proyectos'} className={styles.cancel}>
              Cancelar
            </Link>
            <Button type="submit" className={styles.submit} disabled={pending}>
              {pending ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Crear proyecto'}
            </Button>
          </div>
        </aside>
      </form>
    </main>
  )
}
