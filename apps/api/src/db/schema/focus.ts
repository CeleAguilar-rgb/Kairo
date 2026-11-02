import { sql } from 'drizzle-orm'
import { check, index, integer, timestamp, uuid } from 'drizzle-orm/pg-core'
import { app, userColumns } from './_shared'
import { tasks } from './tasks'

export const focusKindEnum = app.enum('focus_kind', ['work', 'break'])

// Enfoque: cada tramo del pomodoro que terminó. Los puntos del día ("2 de 4"), los minutos de la semana y los
// minutos por proyecto NO son columnas: salen de estas filas y los arma el Next.js (decisión #38). `task_id` es
// opcional y con llave foránea, pero ser de la misma persona lo revisa el service con el de Tareas. Si la tarea se
// borra, la sesión se queda sin tarea (los minutos no se pierden).
export const focusSessions = app
  .table(
    'focus_sessions',
    {
      ...userColumns,
      kind: focusKindEnum('kind').notNull(),
      startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
      minutes: integer('minutes').notNull(),
      taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    },
    (table) => [index('focus_sessions_user_started_idx').on(table.userId, table.startedAt), check('focus_sessions_minutes_range', sql`${table.minutes} between 1 and 180`)],
  )
  .enableRLS()
