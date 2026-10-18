import { boolean, date, integer, text, uuid } from 'drizzle-orm/pg-core'
import { app, userColumns } from './_shared'

export const eventKindEnum = app.enum('event_kind', ['work', 'personal', 'school'])
export const eventRepeatEnum = app.enum('event_repeat', ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'])
export const eventReminderEnum = app.enum('event_reminder', ['none', '10m', '1h', '1d'])

// Segundo módulo de Fase 1b en orden (después de Recordatorios). Una fila es
// un evento O una serie completa, no una vez que ocurre: date es su primer
// día, start_min/end_min son minutos desde medianoche en la zona del perfil
// (no un momento UTC — una serie necesita la misma hora de pared en cada
// vez, y eso se pierde si se guarda ya convertido). until es hasta cuándo
// llega la serie (null = sin fin) y skip, los días sueltos que se borraron
// ("solo este"). project_id sin FK todavía (decisión #37, mismo patrón que
// la 35/36): Proyectos no tiene tabla en la API, el service siempre
// devuelve project: null.
export const events = app
  .table('events', {
    ...userColumns,
    title: text('title').notNull(),
    kind: eventKindEnum('kind').notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    allDay: boolean('all_day').notNull().default(false),
    startMin: integer('start_min'),
    endMin: integer('end_min'),
    place: text('place'),
    projectId: uuid('project_id'),
    notes: text('notes'),
    repeat: eventRepeatEnum('repeat').notNull().default('none'),
    until: date('until', { mode: 'string' }),
    skip: date('skip', { mode: 'string' }).array().notNull().default([]),
    reminder: eventReminderEnum('reminder').notNull().default('none'),
  })
  .enableRLS()
