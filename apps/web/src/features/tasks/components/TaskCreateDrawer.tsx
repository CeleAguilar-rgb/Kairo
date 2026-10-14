'use client'

import { createTaskSchema, TASK_PRIORITIES, TASK_STATUSES, type CreateTaskInput, type TaskPriority, type TaskStatus } from '@kairo/shared'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'

import { PRIORITY_LABEL, STATUS_LABEL } from '../types'

import styles from './TaskCreateDrawer.module.css'

type ProjectOption = { id: string; name: string }

type TaskCreateDrawerProps = {
  open: boolean
  projects: ProjectOption[]
  // Proyecto con el que arranca (el del filtro activo de la pantalla).
  defaultProjectId: string | null
  onClose: () => void
  onCreate: (input: CreateTaskInput) => void
}

export function TaskCreateDrawer({ open, projects, defaultProjectId, onClose, onCreate }: TaskCreateDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Nueva tarea" hideTitle width="lg">
      {/* El formulario es un componente aparte a propósito: Drawer lo desmonta al
          cerrarse, así cada vez que se abre empieza vacío sin tener que limpiarlo a mano. */}
      <TaskCreateForm projects={projects} defaultProjectId={defaultProjectId} onClose={onClose} onCreate={onCreate} />
    </Drawer>
  )
}

type FormProps = Omit<TaskCreateDrawerProps, 'open'>

function TaskCreateForm({ projects, defaultProjectId, onClose, onCreate }: FormProps) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState(defaultProjectId ?? '')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueOn, setDueOn] = useState('')
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [notes, setNotes] = useState('')
  const [titleError, setTitleError] = useState<string | undefined>()

  const titleMissing = !title.trim()

  function addSubtask() {
    const value = newSubtask.trim()
    if (!value) return
    setSubtasks((current) => [...current, value])
    setNewSubtask('')
  }

  function handleSubtaskKey(event: KeyboardEvent<HTMLInputElement>) {
    // Enter agrega la subtarea; sin esto enviaría todo el formulario.
    if (event.key !== 'Enter') return
    event.preventDefault()
    addSubtask()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // Una subtarea escrita que no se agregó con Enter cuenta: nadie quiere perderla.
    const pendingSubtask = newSubtask.trim()
    const result = createTaskSchema.safeParse({
      title,
      projectId: projectId || null,
      status,
      priority,
      dueOn: dueOn || null,
      subtasks: pendingSubtask ? [...subtasks, pendingSubtask] : subtasks,
      notes: notes.trim() || null,
    })

    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'title')
      setTitleError(issue?.message ?? 'Revisa los datos de la tarea.')
      document.getElementById('task-title')?.focus()
      return
    }
    onCreate(result.data)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <header className={styles.head}>
        {/* El título real (para lectores de pantalla) lo pone el Drawer; este es solo visual */}
        <p className={styles.heading} aria-hidden="true">
          Nueva tarea
        </p>
        <button type="button" className={styles.close} aria-label="Cerrar sin guardar" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className={styles.fields}>
        <Input
          id="task-title"
          label="Título"
          value={title}
          maxLength={200}
          autoComplete="off"
          autoFocus
          className={styles.titleInput}
          error={titleError}
          onChange={(event) => {
            setTitle(event.target.value)
            // El error se quita en cuanto se corrige: nada de seguir regañando.
            if (titleError && event.target.value.trim()) setTitleError(undefined)
          }}
          onBlur={() => {
            if (titleMissing && title.length > 0) setTitleError('Escribe qué hay que hacer para crear la tarea.')
          }}
        />

        <Select
          id="task-project"
          label="Proyecto"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          options={[{ value: '', label: 'Sin proyecto' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
        />

        <div className={styles.field}>
          <span className={styles.label} id="task-status-label">
            Estado
          </span>
          <Segmented
            label="Estado"
            mode="radio"
            tone="raised"
            value={status}
            onChange={setStatus}
            options={TASK_STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] }))}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Prioridad</span>
          <div role="radiogroup" aria-label="Prioridad" className={styles.priorities}>
            {TASK_PRIORITIES.map((value) => {
              const selected = priority === value
              return (
                <motion.button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={[styles.priority, styles[`priority_${value}`], selected ? styles.prioritySelected : null].filter(Boolean).join(' ')}
                  onClick={() => setPriority(value)}
                  whileTap={{ scale: 0.94 }}
                  animate={{ opacity: selected ? 1 : 0.7 }}
                  transition={{ duration: DURATION.base }}
                >
                  {PRIORITY_LABEL[value]}
                </motion.button>
              )
            })}
          </div>
        </div>

        <Input
          id="task-due"
          type="date"
          label="Fecha límite"
          labelExtra={<span className={styles.optional}>(opcional)</span>}
          value={dueOn}
          onChange={(event) => setDueOn(event.target.value)}
          hint={dueOn ? 'Aparecerá en Agenda y en Inicio ese día.' : undefined}
        />

        <div className={styles.field}>
          <span className={styles.label}>Subtareas</span>
          <ul className={styles.subs}>
            <AnimatePresence initial={false}>
              {subtasks.map((subtask, index) => (
                <motion.li
                  key={`${index}-${subtask}`}
                  layout
                  layoutDependency={subtasks.length}
                  className={styles.sub}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: SPRING.panel }}
                  exit={{ opacity: 0, x: 16, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
                >
                  <span className={styles.subBox} aria-hidden="true" />
                  <span className={styles.subText}>{subtask}</span>
                  <button
                    type="button"
                    className={styles.subRemove}
                    aria-label={`Quitar subtarea: ${subtask}`}
                    onClick={() => setSubtasks((current) => current.filter((_, i) => i !== index))}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <label htmlFor="task-new-subtask" className={styles.srOnly}>
            Nueva subtarea
          </label>
          <input
            id="task-new-subtask"
            className={styles.textField}
            type="text"
            placeholder="Agregar subtarea y presionar Enter"
            value={newSubtask}
            maxLength={200}
            onChange={(event) => setNewSubtask(event.target.value)}
            onKeyDown={handleSubtaskKey}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="task-notes" className={styles.label}>
            Notas
          </label>
          <textarea id="task-notes" className={styles.textarea} rows={3} maxLength={5000} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
      </div>

      <footer className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className={styles.submit}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5L20 7" />
          </svg>
          Crear tarea
        </Button>
      </footer>
    </form>
  )
}
