import { sql } from 'drizzle-orm'
import { boolean, check, date, integer, text, uuid } from 'drizzle-orm/pg-core'
import { app, userColumns } from './_shared'

export const projectKindEnum = app.enum('project_kind', ['work', 'personal', 'school'])
export const projectStatusEnum = app.enum('project_status', ['active', 'paused', 'done', 'archived'])

// Sexto módulo de Fase 1b (Proyectos va antes que Escuela, decisión #41). El avance, el conteo de tareas y la
// próxima fecha NO son columnas: salen de las tareas del proyecto y los arma el Next.js de en medio (decisión
// #38), como pasa con Agenda y Día a día. `cover_path` guarda "preset:<clave>" para las portadas ilustradas
// (las claves salen de PROJECT_COVER_KEYS en @kairo/shared); la ruta de una imagen subida a Storage llegará con
// el paso de Archivos y tendrá otro prefijo.
export const projects = app
  .table(
    'projects',
    {
      ...userColumns,
      name: text('name').notNull(),
      kind: projectKindEnum('kind').notNull(),
      status: projectStatusEnum('status').notNull().default('active'),
      description: text('description'),
      coverPath: text('cover_path'),
      startedOn: date('started_on', { mode: 'string' }),
      goalOn: date('goal_on', { mode: 'string' }),
      notes: text('notes'),
    },
    (table) => [check('projects_goal_after_start', sql`${table.startedOn} is null or ${table.goalOn} is null or ${table.goalOn} >= ${table.startedOn}`)],
  )
  .enableRLS()

// Los objetivos de un proyecto, en el orden en que se escribieron. Editar el formulario reemplaza la lista: los
// que se quitan van a la papelera (regla 11) y los que conservan su texto conservan si estaban cumplidos.
export const projectObjectives = app
  .table('project_objectives', {
    ...userColumns,
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    done: boolean('done').notNull().default(false),
    position: integer('position').notNull().default(0),
  })
  .enableRLS()

// Los enlaces (solo http/https: lo valida projectLinkSchema y la lista de enlaces se pinta como <a>).
export const projectLinks = app
  .table('project_links', {
    ...userColumns,
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    url: text('url').notNull(),
    position: integer('position').notNull().default(0),
  })
  .enableRLS()
