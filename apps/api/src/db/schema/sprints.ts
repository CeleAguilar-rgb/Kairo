import { sql } from 'drizzle-orm'
import { boolean, check, date, integer, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { app, profiles, userColumns } from './_shared'
import { projects } from './projects'
import { tasks } from './tasks'

export const sprintStatusEnum = app.enum('sprint_status', ['active', 'closed'])

// Los sprints de un proyecto: de una o dos semanas, UNO activo a la vez (el índice único parcial lo garantiza en
// la base, no solo el service). `number` cuenta desde 1 por proyecto. Viven en su propio módulo de Nest
// (`modules/sprints/`) y en su propio archivo de esquema porque cerrar un sprint toca estas dos tablas en UNA
// transacción, sin escribir en la tabla de otro módulo (modules.md).
export const sprints = app
  .table(
    'sprints',
    {
      ...userColumns,
      projectId: uuid('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
      number: integer('number').notNull(),
      goal: text('goal').notNull().default(''),
      startsOn: date('starts_on', { mode: 'string' }).notNull(),
      endsOn: date('ends_on', { mode: 'string' }).notNull(),
      status: sprintStatusEnum('status').notNull().default('active'),
      notes: text('notes'),
      closedAt: timestamp('closed_at', { withTimezone: true }),
    },
    (table) => [
      check('sprints_ends_after_start', sql`${table.endsOn} >= ${table.startsOn}`),
      uniqueIndex('sprints_project_number_uq').on(table.projectId, table.number),
      uniqueIndex('sprints_one_active_per_project_uq').on(table.projectId).where(sql`${table.status} = 'active'`),
    ],
  )
  .enableRLS()

// Qué tareas entraron a un sprint. Es una tabla intermedia (no una columna `tasks.sprint_id`) por dos razones:
// el módulo de Sprints no escribe en la tabla de Tareas, y una tarea que se pasa al siguiente sprint queda en
// los dos (el sprint cerrado sigue diciendo "3 de 5 hechas"). `done` es la foto de si estaba hecha AL CERRAR el
// sprint (nulo mientras sigue activo), para que el historial no cambie si la tarea se termina después. Las
// tareas sin terminar que se "regresan al backlog" simplemente no pasan al sprint nuevo: el backlog son las
// tareas abiertas del proyecto que no están en el sprint activo.
export const sprintTasks = app
  .table(
    'sprint_tasks',
    {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id')
        .notNull()
        .references(() => profiles.id, { onDelete: 'cascade' }),
      sprintId: uuid('sprint_id')
        .notNull()
        .references(() => sprints.id, { onDelete: 'cascade' }),
      taskId: uuid('task_id')
        .notNull()
        .references(() => tasks.id, { onDelete: 'cascade' }),
      done: boolean('done'),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [uniqueIndex('sprint_tasks_sprint_task_uq').on(table.sprintId, table.taskId)],
  )
  .enableRLS()
