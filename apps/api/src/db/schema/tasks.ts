import { date, integer, text, timestamp } from 'drizzle-orm/pg-core'
import { app, userColumns } from './_shared'

export const taskStatusEnum = app.enum('task_status', ['todo', 'in_progress', 'done'])
export const taskPriorityEnum = app.enum('task_priority', ['low', 'medium', 'high'])

// Molde de Fase 1 (Inicio + Tareas): sin project_id, sprint_id ni
// parent_task_id todavía (llegan con Proyectos, ver data-model.md).
// position ordena la lista; lo calcula el service, nunca lo manda la persona.
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
  })
  .enableRLS()
