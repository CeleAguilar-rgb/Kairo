import type { CoverColor, CoverMode, EntryExtraInput, StoryArcInput, StoryResourceInput, TemplateFieldInput, TiptapDoc, WorldRuleInput } from '@kairo/shared'
import { sql } from 'drizzle-orm'
import { boolean, check, date, index, integer, jsonb, smallint, text, uniqueIndex, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { app, userColumns } from './_shared'

export const storyKindEnum = app.enum('story_kind', ['story', 'notebook'])
export const storyColorEnum = app.enum('story_color', ['ink', 'lavender', 'sand'])
export const storyStatusEnum = app.enum('story_status', ['idea', 'in_progress', 'done'])
export const pageKindEnum = app.enum('page_kind', ['chapter', 'note', 'page'])
export const pageStatusEnum = app.enum('page_status', ['none', 'pending', 'in_progress', 'done'])
export const optionToneEnum = app.enum('option_tone', ['ink', 'accent', 'soft', 'warm', 'muted'])
export const noteTemplateKeyEnum = app.enum('note_template_key', ['character', 'species', 'place'])
export const coverModeEnum = app.enum('cover_mode', ['auto', 'color', 'image', 'none'])
export const coverColorEnum = app.enum('cover_color', ['sand', 'lavender_soft', 'lavender', 'sage', 'peach', 'ink'])

// Escritos (decisión #45, ajustada por la #46 y la #47). `pages` es para escribir (capítulos, notas rápidas,
// páginas de cuaderno). La wiki de un mundo son `characters` y `world_notes`, cada una con su plantilla de
// `note_templates`. Las listas cortas que solo viven dentro de su dueño (reglas, campos de una plantilla, arcos,
// elenco, enlaces de ficha, quién/dónde de un evento) son columnas jsonb o arreglos, SIN llave foránea: la API
// valida al escribir que cada id sea de la persona y del mismo mundo, e ignora al leer los que ya no existen.

export const worlds = app
  .table('worlds', {
    ...userColumns,
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    coverPath: text('cover_path'),
    mapPath: text('map_path'),
    synopsis: text('synopsis').notNull().default(''),
    rules: jsonb('rules').$type<WorldRuleInput[]>().notNull().default([]),
    // Nulos = las de fábrica (WORLD_CORE_TABS y DEFAULT_WORLD_STATS en @kairo/shared).
    tabs: jsonb('tabs').$type<string[]>(),
    stats: jsonb('stats').$type<string[]>(),
  })
  .enableRLS()

// Personaje, Especie y Lugar vienen de fábrica (`key`) y no se borran; cada plantilla sin `key` es una sección
// extra del mundo con su pestaña. `fields` es la lista completa de campos en orden; el id de un campo no cambia
// al renombrarlo (los valores de cada nota se guardan por ese id).
export const noteTemplates = app
  .table(
    'note_templates',
    {
      ...userColumns,
      worldId: uuid('world_id')
        .notNull()
        .references(() => worlds.id, { onDelete: 'cascade' }),
      key: noteTemplateKeyEnum('key'),
      name: text('name').notNull(),
      color: optionToneEnum('color').notNull().default('muted'),
      fields: jsonb('fields').$type<TemplateFieldInput[]>().notNull().default([]),
      position: integer('position').notNull().default(0),
    },
    (table) => [
      index('note_templates_world_idx').on(table.worldId),
      // Una sola plantilla de cada tipo de fábrica por mundo.
      uniqueIndex('note_templates_world_key_uq').on(table.worldId, table.key).where(sql`${table.key} is not null and ${table.deletedAt} is null`),
    ],
  )
  .enableRLS()

// Las columnas de una ficha de la wiki: igual en personajes y notas. `values` va por id de campo; `content` son los
// bloques sueltos de su página completa (Tiptap, decisión #32). La portada: dibujo automático, color o imagen.
const entryColumns = () => ({
  name: text('name').notNull(),
  summary: text('summary').notNull().default(''),
  draft: boolean('draft').notNull().default(false),
  values: jsonb('values').$type<Record<string, unknown>>().notNull().default({}),
  // Secciones propias de esta ficha, fuera de la plantilla ("Otra sección solo para esta nota").
  extras: jsonb('extras').$type<EntryExtraInput[]>().notNull().default([]),
  // Un enlace para profundizar fuera de Kairo (Notion, un documento). Solo http(s).
  url: text('url'),
  content: jsonb('content').$type<TiptapDoc>(),
  coverMode: coverModeEnum('cover_mode').$type<CoverMode>().notNull().default('auto'),
  coverColor: coverColorEnum('cover_color').$type<CoverColor>(),
  coverPath: text('cover_path'),
  coverPosition: smallint('cover_position').notNull().default(1),
  position: integer('position').notNull().default(0),
})

// Tabla propia a pedido de la usuaria (decisión #45). Siempre usa la plantilla `character` de su mundo, por eso no
// lleva `template_id`. `sections`: otras secciones extra donde también aparece (la Luna en Deidades).
export const characters = app
  .table(
    'characters',
    {
      ...userColumns,
      worldId: uuid('world_id')
        .notNull()
        .references(() => worlds.id, { onDelete: 'cascade' }),
      ...entryColumns(),
      sections: uuid('sections').array().notNull().default([]),
      imagePath: text('image_path'),
    },
    (table) => [index('characters_world_idx').on(table.worldId)],
  )
  .enableRLS()

// Especies, lugares y lo de las secciones extra. `parent_id`: lugares dentro de lugares (Vadronia → Sudria).
export const worldNotes = app
  .table(
    'world_notes',
    {
      ...userColumns,
      worldId: uuid('world_id')
        .notNull()
        .references(() => worlds.id, { onDelete: 'cascade' }),
      templateId: uuid('template_id')
        .notNull()
        .references(() => noteTemplates.id, { onDelete: 'cascade' }),
      parentId: uuid('parent_id').references((): AnyPgColumn => worldNotes.id, { onDelete: 'set null' }),
      ...entryColumns(),
    },
    (table) => [index('world_notes_world_idx').on(table.worldId), index('world_notes_parent_idx').on(table.parentId)],
  )
  .enableRLS()

// El número romano de una era no se guarda: sale de `position`.
export const worldEras = app
  .table(
    'world_eras',
    {
      ...userColumns,
      worldId: uuid('world_id')
        .notNull()
        .references(() => worlds.id, { onDelete: 'cascade' }),
      name: text('name').notNull(),
      shortName: text('short_name').notNull().default(''),
      summary: text('summary').notNull().default(''),
      note: text('note').notNull().default(''),
      position: integer('position').notNull().default(0),
    },
    (table) => [index('world_eras_world_idx').on(table.worldId)],
  )
  .enableRLS()

// `who` y `where` son ids de personajes o notas del mundo (sin FK, ver arriba). Moverlo de era es cambiar `era_id`.
export const worldEvents = app
  .table(
    'world_events',
    {
      ...userColumns,
      eraId: uuid('era_id')
        .notNull()
        .references(() => worldEras.id, { onDelete: 'cascade' }),
      title: text('title').notNull(),
      description: text('description').notNull().default(''),
      causes: text('causes').notNull().default(''),
      consequences: text('consequences').notNull().default(''),
      notes: text('notes').array().notNull().default([]),
      who: uuid('who').array().notNull().default([]),
      where: uuid('where').array().notNull().default([]),
      position: integer('position').notNull().default(0),
    },
    (table) => [index('world_events_era_idx').on(table.eraId)],
  )
  .enableRLS()

// `arcs` en orden ("Sin arco" no es un arco: es `pages.arc_id` nulo); `cast`, los personajes de la historia (uno
// puede salir en varias); `resources`, el material (enlaces http(s)).
export const stories = app
  .table(
    'stories',
    {
      ...userColumns,
      worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'set null' }),
      title: text('title').notNull(),
      kind: storyKindEnum('kind').notNull(),
      status: storyStatusEnum('status').notNull().default('in_progress'),
      summary: text('summary').notNull().default(''),
      wordGoal: integer('word_goal'),
      color: storyColorEnum('color').notNull().default('ink'),
      eraId: uuid('era_id').references(() => worldEras.id, { onDelete: 'set null' }),
      placeId: uuid('place_id').references(() => worldNotes.id, { onDelete: 'set null' }),
      arcs: jsonb('arcs').$type<StoryArcInput[]>().notNull().default([]),
      cast: uuid('cast').array().notNull().default([]),
      resources: jsonb('resources').$type<StoryResourceInput[]>().notNull().default([]),
    },
    (table) => [
      index('stories_world_idx').on(table.worldId),
      check('stories_word_goal_positive', sql`${table.wordGoal} is null or ${table.wordGoal} > 0`),
    ],
  )
  .enableRLS()

// Capítulos, páginas de cuaderno y notas rápidas. `word_count` lo calcula la API al guardar. Un capítulo no usa
// plantilla editable: arco, era y punto de vista son columnas fijas. `arc_id` es un id de `stories.arcs`, sin FK.
// `tag` es la etiqueta de una nota rápida ("Aurelun", "Ideas").
export const pages = app
  .table(
    'pages',
    {
      ...userColumns,
      storyId: uuid('story_id').references(() => stories.id, { onDelete: 'cascade' }),
      parentId: uuid('parent_id').references((): AnyPgColumn => pages.id, { onDelete: 'set null' }),
      kind: pageKindEnum('kind').notNull(),
      title: text('title').notNull().default(''),
      content: jsonb('content').$type<TiptapDoc>().notNull(),
      status: pageStatusEnum('status').notNull().default('none'),
      tag: text('tag'),
      wordCount: integer('word_count').notNull().default(0),
      coverPath: text('cover_path'),
      position: integer('position').notNull().default(0),
      arcId: uuid('arc_id'),
      eraId: uuid('era_id').references(() => worldEras.id, { onDelete: 'set null' }),
      povCharacterId: uuid('pov_character_id').references(() => characters.id, { onDelete: 'set null' }),
    },
    (table) => [index('pages_story_idx').on(table.storyId), check('pages_word_count_non_negative', sql`${table.wordCount} >= 0`)],
  )
  .enableRLS()

// Cuántas palabras se escribieron cada día (la gráfica de la semana de Escritos, decisión #47). Una fila por día por
// persona; la API suma lo que se agrega al guardar una página (borrar texto no resta lo ya escrito).
export const writingDays = app
  .table(
    'writing_days',
    {
      ...userColumns,
      dayOn: date('day_on', { mode: 'string' }).notNull(),
      words: integer('words').notNull().default(0),
    },
    (table) => [uniqueIndex('writing_days_user_day_uq').on(table.userId, table.dayOn), check('writing_days_words_non_negative', sql`${table.words} >= 0`)],
  )
  .enableRLS()
