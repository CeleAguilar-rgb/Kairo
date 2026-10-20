import { date, integer, text, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { app, userColumns } from './_shared'
import { projects } from './projects'

export const taskStatusEnum = app.enum('task_status', ['todo', 'in_progress', 'review', 'done'])
export const taskPriorityEnum = app.enum('task_priority', ['low', 'medium', 'high'])

// Reconexión de Fase 1b (decisión #35, data-model.md): sin sprint_id todavía
// (llega con Proyectos, en su turno). position ordena la lista; lo calcula el
// service, nunca lo manda la persona.
export const tasks = app
  .table('tasks', {
    ...userColumns,
    title: text('title').notNull(),
    notes: text('notes'),
    status: taskStatusEnum('status').notNull().default('todo'),
    priority: taskPriorityEnum('priority').notNull().default('medium'),
    dueOn: date('due_on'),
    doneAt: timestamp('done_at', { withTimezone: true }),
    position: integer('position').notNull().default(0),
    // Con llave foránea desde que Proyectos tiene tabla (decisión #41). La FK solo garantiza que el proyecto
    // exista, no que sea de la misma persona: eso lo revisa TasksService con el service de Proyectos.
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    // Auto-referenciada: una subtarea es una fila de tasks con parentTaskId
    // apuntando al id de su tarea padre. El callback anota su tipo de retorno
    // porque TypeScript no puede inferirlo solo (la tabla se refiere a sí misma
    // mientras todavía se está definiendo).
    parentTaskId: uuid('parent_task_id').references((): AnyPgColumn => tasks.id, {
      onDelete: 'cascade',
    }),
  })
  .enableRLS()
