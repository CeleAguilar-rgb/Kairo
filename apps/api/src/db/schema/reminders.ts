import { text, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { app, userColumns } from './_shared'

export const reminderRepeatEnum = app.enum('reminder_repeat', ['none', 'daily', 'weekdays'])

// Primer módulo de Fase 1b en orden (después de Tareas). source y precision
// no son columnas todavía (decisión #36): el único creador es el propio
// formulario, siempre manual y siempre con hora. spawnedFromId es cómo
// "Deshacer" sabe qué fila borrar si se completó un recordatorio que se
// repite (nació la siguiente vez).
export const reminders = app
  .table('reminders', {
    ...userColumns,
    title: text('title').notNull(),
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
    doneAt: timestamp('done_at', { withTimezone: true }),
    snoozedTo: timestamp('snoozed_to', { withTimezone: true }),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    repeat: reminderRepeatEnum('repeat').notNull().default('none'),
    spawnedFromId: uuid('spawned_from_id').references((): AnyPgColumn => reminders.id, {
      onDelete: 'cascade',
    }),
  })
  .enableRLS()
