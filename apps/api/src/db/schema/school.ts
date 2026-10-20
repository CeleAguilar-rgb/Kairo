import { sql } from 'drizzle-orm'
import { check, date, numeric, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { app, userColumns } from './_shared'
import { projects } from './projects'

export const subjectColorEnum = app.enum('subject_color', ['lavender', 'ink', 'sand', 'lavender_soft', 'peach'])

// Séptimo módulo de Fase 1b (Escuela va después de Proyectos, decisión #41). Escuela solo tiene tablas propias
// para lo que Proyectos, Tareas y Agenda no pueden guardar (decisión #43): el periodo y lo propio de una materia.
// El nombre de la materia es el de su proyecto, las clases son eventos semanales de Agenda y las entregas son
// tareas del proyecto: nada de eso se repite aquí.
//
// `status` (por empezar, en curso, terminado) NO es columna: sale de las fechas y se quedaría viejo. Las
// tareas del proyecto de preparación son la lista de "Antes de empezar" (no hay una tabla `prep_items`).
export const schoolTerms = app
  .table(
    'school_terms',
    {
      ...userColumns,
      name: text('name').notNull(),
      startsOn: date('starts_on', { mode: 'string' }).notNull(),
      endsOn: date('ends_on', { mode: 'string' }).notNull(),
      // Con llave foránea, pero ser de la misma persona lo revisa el service con el de Proyectos.
      prepProjectId: uuid('prep_project_id').references(() => projects.id, { onDelete: 'set null' }),
    },
    (table) => [check('school_terms_ends_after_start', sql`${table.endsOn} >= ${table.startsOn}`)],
  )
  .enableRLS()

// Una materia es un proyecto `school` (project_id, único) con lo que un proyecto no tiene: profesor, color y las
// calificaciones. Los parciales son tres columnas porque el canvas son tres columnas fijas (Parcial 1, Parcial 2
// y Final); `numeric(3,1)` guarda de 0.0 a 10.0 (nulo = todavía sin calificar). `term_id` nulo = materia sin
// periodo todavía: la toma el primer periodo que se cree.
export const subjects = app
  .table(
    'subjects',
    {
      ...userColumns,
      projectId: uuid('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
      termId: uuid('term_id').references(() => schoolTerms.id, { onDelete: 'set null' }),
      teacher: text('teacher'),
      color: subjectColorEnum('color').notNull(),
      midterm1: numeric('midterm_1', { precision: 3, scale: 1 }),
      midterm2: numeric('midterm_2', { precision: 3, scale: 1 }),
      final: numeric('final', { precision: 3, scale: 1 }),
    },
    (table) => [
      uniqueIndex('subjects_project_uq').on(table.projectId),
      check('subjects_midterm_1_range', sql`${table.midterm1} is null or ${table.midterm1} between 0 and 10`),
      check('subjects_midterm_2_range', sql`${table.midterm2} is null or ${table.midterm2} between 0 and 10`),
      check('subjects_final_range', sql`${table.final} is null or ${table.final} between 0 and 10`),
    ],
  )
  .enableRLS()
