import { boolean, date, doublePrecision, integer, text, time, timestamp, uuid } from 'drizzle-orm/pg-core'
import { app, profiles, userColumns } from './_shared'

export const routineKindEnum = app.enum('routine_kind', ['habit', 'meal', 'focus', 'free'])
export const routineIconEnum = app.enum('routine_icon', ['sun', 'drop', 'pill', 'food', 'cap', 'code', 'pen', 'work', 'moon'])
export const mealEnum = app.enum('meal', ['breakfast', 'lunch', 'dinner'])
export const journalTagEnum = app.enum('journal_tag', ['work', 'school', 'projects', 'friends', 'family', 'health', 'writing'])
export const goalAreaEnum = app.enum('goal_area', ['work', 'personal', 'school', 'health', 'money'])
export const goalKindEnum = app.enum('goal_kind', ['milestones', 'number', 'habit', 'project'])
export const goalStatusEnum = app.enum('goal_status', ['active', 'done', 'paused'])

// Cuarto módulo de Fase 1b. days: lunes(0)…domingo(6), sin importar el
// week_start del perfil (mismo índice que usa el front, routine-utils.ts).
export const routines = app
  .table('routines', {
    ...userColumns,
    name: text('name').notNull(),
    days: boolean('days').array().notNull(),
    active: boolean('active').notNull().default(true),
  })
  .enableRLS()

// starts_at/ends_at son horas de pared (time), igual que event.start_min en Agenda pero sin convertir a
// minutos: un hábito no tiene duración real que medir, solo "a qué hora". link: área fija
// ('school'|'work'|'personal') o id de proyecto — sin FK, Proyectos no tiene tabla todavía (mismo patrón
// que project_id en Tareas/Agenda). note: el front todavía no tiene un formulario que lo edite
// (routineBlockSchema no trae ese campo); se deja listo para cuando lo pida.
export const routineBlocks = app
  .table('routine_blocks', {
    ...userColumns,
    routineId: uuid('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    startsAt: time('starts_at').notNull(),
    endsAt: time('ends_at'),
    title: text('title').notNull(),
    kind: routineKindEnum('kind').notNull(),
    icon: routineIconEnum('icon').notNull(),
    position: integer('position').notNull().default(0),
    alert: boolean('alert').notNull().default(false),
    nagMinutes: integer('nag_minutes').notNull().default(0),
    countsForReport: boolean('counts_for_report').notNull().default(true),
    link: text('link'),
    note: text('note'),
  })
  .enableRLS()

// Un registro por bloque por día: a qué hora se marcó y si fue tarde (lo decide la API con su reloj, no
// la pantalla). Borrar la rutina o el bloque (deleted_at) NO borra sus logs: son el historial del reporte.
// focus_done: cuántas tareas de enfoque van hechas hoy en ese bloque (solo aplica a kind='focus'); nace en
// 0 y sube con /routine-blocks/:id/complete-focus-task, que además crea el log la primera vez.
export const routineLogs = app
  .table('routine_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    blockId: uuid('block_id')
      .notNull()
      .references(() => routineBlocks.id, { onDelete: 'cascade' }),
    logDate: date('log_date', { mode: 'string' }).notNull(),
    doneAt: time('done_at').notNull(),
    late: boolean('late').notNull(),
    focusDone: integer('focus_done').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  })
  .enableRLS()

// has_event (si cae un evento de la Agenda en esa comida) no es columna: se deriva al leer, como project
// en Tareas/Agenda — guardarlo congelado se desincroniza en cuanto el evento se mueve o se borra.
export const mealPlans = app
  .table('meal_plans', {
    ...userColumns,
    planDate: date('plan_date', { mode: 'string' }).notNull(),
    meal: mealEnum('meal').notNull(),
    dish: text('dish').notNull(),
    done: boolean('done').notNull().default(false),
    prep: boolean('prep').notNull().default(false),
    note: text('note'),
  })
  .enableRLS()

// body sin cifrar y sin PIN (decisión #38: la usuaria pidió construirlo así por ahora, en contra de lo
// que señalaba security.md — ver decisions.md). summary: "Tu día en resumen" se congela al guardar, lo
// manda ya armado la Server Action (mezcla avance real de la rutina + extras que siguen fijos).
export const journalEntries = app
  .table('journal_entries', {
    ...userColumns,
    entryDate: date('entry_date', { mode: 'string' }).notNull(),
    mood: integer('mood').notNull(),
    body: text('body').notNull().default(''),
    gratitude: text('gratitude').array().notNull().default([]),
    tags: journalTagEnum('tags').array().notNull().default([]),
    summary: text('summary').array().notNull().default([]),
    savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
  })
  .enableRLS()

// target/current en double precision (no centavos: la unidad la elige la persona — "libros", "km" — y no
// siempre es dinero; cuando sí lo es, decisión nuestra no tratarla como columna de Finanzas todavía).
// Para kind 'milestones'/'project'/'habit' el service siempre recalcula target/current/unit al leer
// (deriveGoal, igual que hoy en el front): lo guardado en esas columnas para esos tres tipos no se usa.
// block_id SÍ lleva FK (routine_blocks es de este mismo módulo); project_id no (Proyectos sin tabla).
export const goals = app
  .table('goals', {
    ...userColumns,
    title: text('title').notNull(),
    area: goalAreaEnum('area').notNull(),
    kind: goalKindEnum('kind').notNull(),
    status: goalStatusEnum('status').notNull().default('active'),
    target: doublePrecision('target'),
    current: doublePrecision('current').notNull().default(0),
    unit: text('unit').notNull().default(''),
    blockId: uuid('block_id').references(() => routineBlocks.id, { onDelete: 'set null' }),
    projectId: uuid('project_id'),
    dueOn: date('due_on', { mode: 'string' }),
    why: text('why').notNull().default(''),
    achievedOn: date('achieved_on', { mode: 'string' }),
  })
  .enableRLS()

export const goalMilestones = app
  .table('goal_milestones', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    done: boolean('done').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  })
  .enableRLS()

export const goalLogEntries = app
  .table('goal_log_entries', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    logDate: date('log_date', { mode: 'string' }).notNull(),
    amount: doublePrecision('amount').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  })
  .enableRLS()
