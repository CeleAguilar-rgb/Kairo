'use client'

import type { CreateTaskInput } from '@kairo/shared'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import dynamic from 'next/dynamic'
import { useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { projectTone } from '@/features/projects'
import type { IsoDate } from '@/lib/dates'
import { EASE_OUT, SPRING } from '@/lib/motion'

import { createTask, deleteTask, restoreTask, updateTaskStatus } from '../actions'
import { groupTasks } from '../grouping'
import type { Task, TaskStatus } from '../types'

import { TaskBoard } from './TaskBoard'
import { TaskDeleteDialog } from './TaskDeleteDialog'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import { TaskList } from './TaskList'
import styles from './TasksView.module.css'

// El formulario de nueva tarea trae la validación (zod, ~30 KB) y solo se usa al pulsar
// "Nueva tarea": se descarga en ese momento (o antes, si el mouse se acerca al botón),
// no con cada visita a la pantalla.
const loadCreateDrawer = () =>
  import('./TaskCreateDrawer').then((module) => module.TaskCreateDrawer)
const TaskCreateDrawer = dynamic(loadCreateDrawer, { ssr: false })

type ProjectOption = { id: string; name: string }
type View = 'list' | 'board'

type TasksViewProps = {
  initialTasks: Task[]
  projects: ProjectOption[]
  today: IsoDate
  weekEnd: IsoDate
  // Viene de /tareas?nueva=1 (el "+" de la tarjeta de Inicio).
  startWithCreate: boolean
  // Viene de /tareas?proyecto=<id> ("Ver en el tablero" de un proyecto): el filtro con el que abre.
  initialProjectId?: string
}

// Pantalla Tareas (Tareas.dc.html + TareaNueva.dc.html). Optimista: cada
// acción cambia el estado local al instante y la Server Action va detrás
// (como SeccionesTab); crear es la excepción, porque necesita el id real
// antes de dejar interactuar con la tarjeta.
export function TasksView({
  initialTasks,
  projects,
  today,
  weekEnd,
  startWithCreate,
  initialProjectId,
}: TasksViewProps) {
  const toast = useToast()
  const [tasks, setTasks] = useState(initialTasks)
  const [view, setView] = useState<View>('list')
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId ?? 'all')
  const [showDone, setShowDone] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(startWithCreate)
  // Se monta la primera vez que se abre y se queda, para que la animación de salida corra.
  const [createLoaded, setCreateLoaded] = useState(startWithCreate)
  const [recentId, setRecentId] = useState<string | null>(null)
  // Tarea esperando confirmación en el diálogo de borrar; null = cerrado.
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  // Crear sí espera a la API: necesitamos el id real antes de dejar que la
  // persona interactúe con la tarjeta (marcarla, abrir su detalle). Mover o
  // marcar una ya existente no espera: se ve al instante (startTransition)
  // y el servidor se pone al día detrás.
  const [isCreating, startCreating] = useTransition()
  const [, startTransition] = useTransition()

  const filtered = useMemo(
    () =>
      projectFilter === 'all'
        ? tasks
        : tasks.filter((t) => t.project?.id === projectFilter),
    [tasks, projectFilter],
  )
  const groups = useMemo(
    () => groupTasks(filtered, today, weekEnd, showDone),
    [filtered, today, weekEnd, showDone],
  )
  const openTask = tasks.find((t) => t.id === openId) ?? null
  const activeProject = projects.find((p) => p.id === projectFilter) ?? null

  const pendingTotal = tasks.filter((t) => t.status !== 'done').length
  const dueThisWeek = tasks.filter(
    (t) => t.status !== 'done' && t.dueOn && t.dueOn <= weekEnd,
  ).length
  const summary = `${pendingTotal} ${pendingTotal === 1 ? 'pendiente' : 'pendientes'} en total, ${dueThisWeek} ${dueThisWeek === 1 ? 'vence' : 'vencen'} esta semana.`

  function patch(taskId: string, change: (task: Task) => Task) {
    setTasks((current) => current.map((t) => (t.id === taskId ? change(t) : t)))
  }

  // Optimista: la pantalla cambia al instante y el PATCH va detrás. Sirve
  // tanto para una tarea (taskId = su id) como para una subtarea (taskId =
  // el id de la subtarea): las dos son filas de tasks en la API.
  function applyStatus(taskId: string, status: TaskStatus, cascadeSubtasks = false) {
    patch(taskId, (t) => ({
      ...t,
      status,
      doneAt: status === 'done' ? new Date().toISOString() : null,
      // Al cerrar una tarea, sus subtareas quedan hechas (así lo hace el canvas).
      subtasks:
        cascadeSubtasks && status === 'done'
          ? t.subtasks.map((s) => ({ ...s, done: true }))
          : t.subtasks,
    }))
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, status)
      if ('error' in result) toast.show({ message: result.error, icon: 'info' })
    })
  }

  function setStatus(task: Task, status: TaskStatus) {
    if (task.status === status) return
    applyStatus(task.id, status, true)
  }

  function toggleDone(task: Task) {
    setStatus(task, task.status === 'done' ? 'todo' : 'done')
  }

  function toggleSubtask(task: Task, subtaskId: string) {
    const subtask = task.subtasks.find((s) => s.id === subtaskId)
    if (!subtask) return
    const done = !subtask.done
    patch(task.id, (t) => ({
      ...t,
      subtasks: t.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, done } : s,
      ),
    }))
    startTransition(async () => {
      const result = await updateTaskStatus(subtaskId, done ? 'done' : 'todo')
      if ('error' in result) toast.show({ message: result.error, icon: 'info' })
    })
  }

  function handleCreate(input: CreateTaskInput) {
    startCreating(async () => {
      const result = await createTask(input)
      if ('error' in result) {
        toast.show({ message: result.error, icon: 'info' })
        return
      }
      const { task } = result
      setTasks((current) => [task, ...current])
      setRecentId(task.id)
      setTimeout(
        () => setRecentId((current) => (current === task.id ? null : current)),
        2600,
      )
      setCreateOpen(false)
      toast.show({ message: `"${task.title}" se creó.`, icon: 'check' })
    })
  }

  function handleQuickAdd(title: string) {
    handleCreate({
      title,
      projectId: activeProject?.id ?? null,
      status: 'todo',
      priority: 'medium',
      dueOn: null,
      subtasks: [],
      notes: null,
    })
  }

  // Optimista, pero guardando la tarea por si el PATCH falla o la persona
  // pica "Deshacer": sin eso no habría nada que devolver a la lista sin
  // pedírselo otra vez al servidor.
  function handleDeleteConfirm(task: Task) {
    setDeletingTask(null)
    setTasks((current) => current.filter((t) => t.id !== task.id))
    if (openId === task.id) setOpenId(null)

    startTransition(async () => {
      const result = await deleteTask(task.id)
      if ('error' in result) {
        setTasks((current) => [task, ...current])
        toast.show({ message: result.error, icon: 'info' })
        return
      }
      toast.show({
        message: `"${task.title}" se movió a la papelera.`,
        icon: 'trash',
        onUndo: () => {
          setTasks((current) => [task, ...current])
          startTransition(async () => {
            const restored = await restoreTask(task.id)
            if ('error' in restored) toast.show({ message: restored.error, icon: 'info' })
          })
        },
      })
    })
  }

  const pendingIn = (projectId: string) =>
    tasks.filter((t) => t.project?.id === projectId && t.status !== 'done')
      .length

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heading}>
          <div className={styles.titleRow}>
            <motion.h1
              className={styles.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            >
              Tareas
            </motion.h1>
            <motion.span
              className={styles.bolt}
              initial={{ scale: 0, rotate: -50 }}
              animate={{ scale: 1, rotate: 10 }}
              transition={{ ...SPRING.pop, delay: 0.5 }}
              whileHover={{ rotate: -8, scale: 1.1 }}
            >
              <Doodle kind="bolt" size={42} />
            </motion.span>
          </div>
          <svg
            className={styles.squiggle}
            width="200"
            height="14"
            viewBox="0 0 300 16"
            fill="none"
            aria-hidden="true"
          >
            <motion.path
              d="M3 10c22-8 40 6 64-1s40-8 62 0 44 7 66-1 46-6 72 3 30-3 30-3"
              stroke="var(--accent)"
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
            />
          </svg>
          <motion.p
            className={styles.summary}
            aria-live="polite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.14 }}
          >
            {summary}
          </motion.p>
        </div>

        <motion.div
          className={styles.controls}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 }}
        >
          <motion.button
            type="button"
            className={[
              styles.doneToggle,
              showDone ? styles.doneToggleOn : null,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={showDone}
            onClick={() => setShowDone((value) => !value)}
            whileTap={{ scale: 0.96 }}
            // En el tablero las hechas siempre se ven en su columna: el interruptor no aplica.
            disabled={view === 'board'}
            title={
              view === 'board'
                ? 'En el tablero las hechas están en su columna'
                : undefined
            }
          >
            <LineIcon d="M5 12l5 5L20 7" size={16} strokeWidth={2} />
            Mostrar hechas
          </motion.button>
          <Segmented
            label="Vista"
            value={view}
            onChange={setView}
            options={[
              {
                value: 'list',
                label: (
                  <>
                    <LineIcon
                      d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"
                      size={16}
                      strokeWidth={2}
                    />
                    Lista
                  </>
                ),
              },
              {
                value: 'board',
                label: (
                  <>
                    <LineIcon
                      d={[
                        'M4.5 4h2A1.5 1.5 0 0 1 8 5.5v13A1.5 1.5 0 0 1 6.5 20h-2A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4z',
                        'M11.5 4h2A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 10 12.5v-7A1.5 1.5 0 0 1 11.5 4z',
                        'M18.5 4h1A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 18.5 4z',
                      ]}
                      size={16}
                      strokeWidth={2}
                    />
                    Tablero
                  </>
                ),
              },
            ]}
          />
          <Button
            onClick={() => {
              setCreateLoaded(true)
              setCreateOpen(true)
            }}
            onPointerEnter={() => void loadCreateDrawer()}
            onFocus={() => void loadCreateDrawer()}
          >
            <LineIcon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />
            Nueva tarea
          </Button>
        </motion.div>
      </section>

      <LayoutGroup id="task-filters">
        <div
          className={styles.filters}
          role="group"
          aria-label="Filtrar por proyecto"
        >
          {[{ id: 'all', name: 'Todas' }, ...projects].map((project, index) => {
            const selected = projectFilter === project.id
            const count =
              project.id === 'all' ? pendingTotal : pendingIn(project.id)
            return (
              <motion.button
                key={project.id}
                type="button"
                className={[
                  styles.filter,
                  selected ? styles.filterSelected : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={selected}
                onClick={() => setProjectFilter(project.id)}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.2 + index * 0.04 }}
              >
                {selected ? (
                  <motion.span
                    layoutId="filter-pill"
                    className={styles.filterPill}
                    transition={SPRING.slide}
                  />
                ) : null}
                {project.id !== 'all' ? (
                  <span
                    className={styles.filterDot}
                    style={{ background: projectTone(project.id) }}
                    aria-hidden="true"
                  />
                ) : null}
                <span className={styles.filterName}>{project.name}</span>
                <span className={styles.filterCount}>{count}</span>
              </motion.button>
            )
          })}
        </div>
      </LayoutGroup>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.3, ease: EASE_OUT },
          }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
        >
          {view === 'list' ? (
            <TaskList
              groups={groups}
              today={today}
              weekEnd={weekEnd}
              openId={openId}
              recentId={recentId}
              quickProjectName={activeProject?.name ?? 'Sin proyecto'}
              onToggleDone={toggleDone}
              onOpen={(task) => setOpenId(task.id)}
              onQuickAdd={handleQuickAdd}
              onDelete={setDeletingTask}
            />
          ) : (
            <TaskBoard
              tasks={filtered}
              today={today}
              weekEnd={weekEnd}
              onOpen={(task) => setOpenId(task.id)}
              onMove={setStatus}
              onDelete={setDeletingTask}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <TaskDetailDrawer
        task={openTask}
        today={today}
        onClose={() => setOpenId(null)}
        onToggleDone={toggleDone}
        onToggleSubtask={toggleSubtask}
        onChangeStatus={setStatus}
        onDelete={setDeletingTask}
      />
      <TaskDeleteDialog
        task={deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteConfirm}
      />
      {createLoaded ? (
        <TaskCreateDrawer
          open={createOpen}
          projects={projects}
          defaultProjectId={activeProject?.id ?? null}
          pending={isCreating}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
      ) : null}
    </main>
  )
}
