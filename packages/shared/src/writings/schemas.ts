import { z } from 'zod'

import {
  COVER_COLORS,
  COVER_MODES,
  FIELD_KINDS,
  MAX_FIELD_OPTIONS,
  MAX_PAGE_TITLE,
  MAX_TEMPLATE_FIELDS,
  NOTE_TEMPLATE_FIELD_TYPES,
  OPTION_TONES,
  PAGE_KINDS,
  PAGE_STATUSES,
  STORY_COLORS,
  STORY_KINDS,
  STORY_STATUSES,
  TEMPLATE_FIELD_KEYS,
  WORLD_CORE_STATS,
  WORLD_CORE_TABS,
} from './constants'
import { isValidTiptapDoc, type TiptapDoc } from './tiptap'

// Los esquemas de Escritos: los usan las Server Actions del front (validar antes de mandar) y la API (validar lo
// que llega). La API vuelve a revisar todo lo que depende de la base: que cada id nombrado sea de la persona y de
// su mundo, y que el valor de cada campo sea del tipo que dice su plantilla (eso no cabe aquí: hace falta la
// plantilla).

// El contenido de una página o de una nota: JSON de Tiptap, revisado a fondo en ./tiptap (tipos de bloque
// permitidos, direcciones seguras, tamaño máximo). Un JSON que no pase esa revisión no se guarda (decisión #32).
export const tiptapDocSchema = z.custom<TiptapDoc>((value) => isValidTiptapDoc(value), 'Ese contenido no es válido.')

// Una lista de ids (los personajes de un evento, el elenco de una historia…). Sin repetidos.
const idList = (max: number) =>
  z
    .array(z.uuid())
    .max(max, `Máximo ${max}.`)
    .refine((ids) => new Set(ids).size === ids.length, 'Hay elementos repetidos.')

// Un PATCH tiene que cambiar algo: un cuerpo vacío es casi siempre un error de la pantalla.
const notEmpty = (value: object) => Object.values(value).some((item) => item !== undefined)
const notEmptyIssue = { error: 'No hay nada que guardar.' }

// --- Mundos -------------------------------------------------------------------------------------------

const worldName = z.string().trim().min(1, 'Ponle un nombre.').max(60, 'Máximo 60 caracteres.')
const worldDescription = z.string().trim().max(400, 'Máximo 400 caracteres.')

// "Nuevo mundo" (EscritosInicio): el nombre y de qué trata. Nace con sus 3 plantillas de fábrica.
export const worldSchema = z.object({ name: worldName, description: worldDescription })

export type WorldInput = z.infer<typeof worldSchema>

// Una regla del mundo ("Reglas del mundo" del Resumen).
export const worldRuleSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, 'Ponle un título.').max(80, 'Máximo 80 caracteres.'),
  text: z.string().trim().max(1000, 'Máximo 1000 caracteres.'),
})

export type WorldRuleInput = z.infer<typeof worldRuleSchema>

// Una pestaña o un contador de la barra del mundo: uno de los fijos o `tpl:<id>` de una sección extra.
const tplRef = z.string().regex(/^tpl:[0-9a-f-]{36}$/i, 'Esa sección no existe.')
const worldTab = z.union([z.enum(WORLD_CORE_TABS), tplRef])
const worldStat = z.union([z.enum(WORLD_CORE_STATS), tplRef])

// Lo que se edita de un mundo, una cosa a la vez: el nombre, la sinopsis del Resumen, las reglas, qué pestañas van
// en la barra y qué contadores se ven (EscritosPestanas, EscritosContadores). Solo viaja lo que cambió.
export const worldUpdateSchema = z
  .object({
    name: worldName.optional(),
    description: worldDescription.optional(),
    synopsis: z.string().trim().max(4000, 'Máximo 4000 caracteres.').optional(),
    rules: z.array(worldRuleSchema).max(30, 'Máximo 30 reglas.').optional(),
    tabs: z
      .array(worldTab)
      .max(30)
      .refine((tabs) => new Set(tabs).size === tabs.length, 'Hay pestañas repetidas.')
      .refine((tabs) => tabs.includes('resumen'), 'El Resumen siempre va en la barra.')
      .optional(),
    stats: z
      .array(worldStat)
      .max(20)
      .refine((stats) => new Set(stats).size === stats.length, 'Hay contadores repetidos.')
      .optional(),
  })
  .refine(notEmpty, notEmptyIssue)

export type WorldUpdateInput = z.infer<typeof worldUpdateSchema>

// --- Plantillas ---------------------------------------------------------------------------------------

export const templateNameSchema = z.string().trim().min(1, 'Ponle un nombre.').max(40, 'Máximo 40 caracteres.')
export const templateFieldTypeSchema = z.enum(NOTE_TEMPLATE_FIELD_TYPES)
// La pregunta guía de una sección "Para rellenar" (opcional, EscritosPlantilla.dc.html).
export const templateFieldHintSchema = z.string().trim().max(120, 'Máximo 120 caracteres.')

export const fieldOptionSchema = z.object({
  // Las opciones de fábrica tienen id legible ("region"); las nuevas, un uuid. Solo letras, números y guiones.
  id: z.string().regex(/^[a-z0-9-]{1,40}$/i, 'Esa opción no es válida.'),
  label: z.string().trim().min(1, 'Ponle un nombre a la opción.').max(40, 'Máximo 40 caracteres.'),
  tone: z.enum(OPTION_TONES),
})

export const templateFieldSchema = z.object({
  id: z.uuid(),
  kind: z.enum(FIELD_KINDS),
  key: z.enum(TEMPLATE_FIELD_KEYS).nullable(),
  // Un campo nuevo nace sin nombre ("Campo nuevo" lo pinta la pantalla), así que aquí se permite vacío.
  name: z.string().trim().max(40, 'Máximo 40 caracteres.'),
  type: templateFieldTypeSchema,
  hint: templateFieldHintSchema,
  options: z.array(fieldOptionSchema).max(MAX_FIELD_OPTIONS, `Máximo ${MAX_FIELD_OPTIONS} opciones.`),
})

export type TemplateFieldInput = z.infer<typeof templateFieldSchema>

// "Nueva sección" (menú Más): nace con un campo y una sección y se abre su editor de plantilla.
export const templateCreateSchema = z.object({ name: templateNameSchema })

// El editor de plantillas guarda la plantilla completa: su nombre, su color y la lista entera de campos en orden.
// El id de cada campo no cambia nunca (los valores de cada nota se guardan por ese id, data-model.md).
export const templateUpdateSchema = z
  .object({
    name: templateNameSchema.optional(),
    color: z.enum(OPTION_TONES).optional(),
    fields: z
      .array(templateFieldSchema)
      .max(MAX_TEMPLATE_FIELDS, `Máximo ${MAX_TEMPLATE_FIELDS} campos.`)
      .refine((fields) => new Set(fields.map((item) => item.id)).size === fields.length, 'Hay campos repetidos.')
      .refine((fields) => fields.every((item) => !item.key || fields.filter((other) => other.key === item.key).length === 1), 'Un campo especial no puede repetirse.')
      .optional(),
  })
  .refine(notEmpty, notEmptyIssue)

export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>

// --- Personajes y notas del mundo -------------------------------------------------------------------------

// El valor de un campo: texto (campos cortos y secciones), número, ids (un vínculo) o vacío. Que corresponda con el
// tipo del campo lo revisa la API, que conoce la plantilla.
export const fieldValueSchema = z.union([
  z.string().trim().max(5000, 'Máximo 5000 caracteres.'),
  z.number().finite('Escribe un número.'),
  idList(100),
  z.null(),
])

export type FieldValue = z.infer<typeof fieldValueSchema>

// Los valores que cambian, por id de campo. La API los junta con los que ya había (solo viaja lo que cambió).
export const fieldValuesSchema = z
  .record(z.uuid(), fieldValueSchema)
  .refine((values) => Object.keys(values).length <= 64, 'Demasiados campos de una vez.')

// La portada (EscritosPortada.dc.html). La imagen subida no viaja aquí: se sube aparte con URL firmada.
export const coverSchema = z
  .object({
    mode: z.enum(COVER_MODES),
    color: z.enum(COVER_COLORS).nullable(),
    position: z.number().int().min(0).max(2),
  })
  .refine((cover) => cover.mode !== 'color' || cover.color !== null, { path: ['color'], error: 'Elige un color.' })

export type CoverInput = z.infer<typeof coverSchema>

// "Otra sección solo para esta nota" (panel de una ficha): secciones propias que no están en la plantilla.
export const entryExtraSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, 'Ponle un título a la sección.').max(60, 'Máximo 60 caracteres.'),
  text: z.string().trim().max(5000, 'Máximo 5000 caracteres.'),
})

export type EntryExtraInput = z.infer<typeof entryExtraSchema>

const entryExtras = z
  .array(entryExtraSchema)
  .max(20, 'Máximo 20 secciones propias.')
  .refine((extras) => new Set(extras.map((item) => item.id)).size === extras.length, 'Hay secciones repetidas.')

// El enlace para profundizar fuera de Kairo ("Profundizar en Notion ↗"). Solo http(s); vacío = sin enlace.
const entryUrl = z
  .url({ protocol: /^https?$/, hostname: z.regexes.domain, error: 'Ese enlace no se ve completo. Empieza con https://' })
  .max(2048, 'El enlace es demasiado largo.')
  .nullable()

const entryName = z.string().trim().min(1, 'Ponle un nombre.').max(80, 'Máximo 80 caracteres.')
const entrySummary = z.string().trim().max(2000, 'Máximo 2000 caracteres.')

// "+ Agregar personaje": nace con su nombre y se abre en modo editar.
export const characterCreateSchema = z.object({ name: entryName })

export type CharacterCreateInput = z.infer<typeof characterCreateSchema>

// Lo que se edita de un personaje desde su panel o su página completa. `sections`: otras secciones extra donde
// también aparece (la Luna en Deidades).
export const characterUpdateSchema = z
  .object({
    name: entryName.optional(),
    summary: entrySummary.optional(),
    draft: z.boolean().optional(),
    values: fieldValuesSchema.optional(),
    sections: idList(20).optional(),
    extras: entryExtras.optional(),
    url: entryUrl.optional(),
    content: tiptapDocSchema.optional(),
    cover: coverSchema.optional(),
  })
  .refine(notEmpty, notEmptyIssue)

export type CharacterUpdateInput = z.infer<typeof characterUpdateSchema>

// "+ Agregar especie / región / lugar dentro / nota de Magia": la plantilla dice qué es; `parentId` solo en
// lugares dentro de lugares.
export const noteCreateSchema = z.object({ templateId: z.uuid(), parentId: z.uuid().nullable(), name: entryName })

export type NoteCreateInput = z.infer<typeof noteCreateSchema>

export const noteUpdateSchema = z
  .object({
    name: entryName.optional(),
    summary: entrySummary.optional(),
    draft: z.boolean().optional(),
    values: fieldValuesSchema.optional(),
    extras: entryExtras.optional(),
    url: entryUrl.optional(),
    content: tiptapDocSchema.optional(),
    cover: coverSchema.optional(),
    parentId: z.uuid().nullable().optional(),
  })
  .refine(notEmpty, notEmptyIssue)

export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>

// --- Línea del tiempo -------------------------------------------------------------------------------------

const eraFields = {
  name: z.string().trim().min(1, 'Ponle un nombre.').max(80, 'Máximo 80 caracteres.'),
  shortName: z.string().trim().max(30, 'Máximo 30 caracteres.'),
  summary: z.string().trim().max(1000, 'Máximo 1000 caracteres.'),
  note: z.string().trim().max(1000, 'Máximo 1000 caracteres.'),
}

// "+ Era": nace al final con nombre y lo demás vacío.
export const eraCreateSchema = z.object({ name: eraFields.name })

export const eraUpdateSchema = z
  .object({
    name: eraFields.name.optional(),
    shortName: eraFields.shortName.optional(),
    summary: eraFields.summary.optional(),
    note: eraFields.note.optional(),
  })
  .refine(notEmpty, notEmptyIssue)

export type EraUpdateInput = z.infer<typeof eraUpdateSchema>

// Mover una era o un evento un lugar antes o después (las flechas del panel).
export const moveSchema = z.object({ direction: z.enum(['up', 'down']) })

export type MoveInput = z.infer<typeof moveSchema>

const eventTitle = z.string().trim().min(1, 'Ponle un título.').max(120, 'Máximo 120 caracteres.')
const longText = z.string().trim().max(3000, 'Máximo 3000 caracteres.')

export const eventCreateSchema = z.object({ eraId: z.uuid(), title: eventTitle })

export type EventCreateInput = z.infer<typeof eventCreateSchema>

// El panel de un evento (EscritosLinea): qué pasó, quién, dónde, notas sueltas, causas y consecuencias. Cambiar
// `eraId` lo manda al final de otra era.
export const eventUpdateSchema = z
  .object({
    title: eventTitle.optional(),
    description: longText.optional(),
    causes: longText.optional(),
    consequences: longText.optional(),
    notes: z.array(z.string().trim().min(1).max(500, 'Cada nota puede tener hasta 500 caracteres.')).max(50, 'Máximo 50 notas.').optional(),
    who: idList(50).optional(),
    where: idList(50).optional(),
    eraId: z.uuid().optional(),
  })
  .refine(notEmpty, notEmptyIssue)

export type EventUpdateInput = z.infer<typeof eventUpdateSchema>

// --- Historias y cuadernos -----------------------------------------------------------------------------------

const storyFields = {
  title: z.string().trim().min(1, 'Ponle un título.').max(80, 'Máximo 80 caracteres.'),
  kind: z.enum(STORY_KINDS),
  summary: z.string().trim().max(1000, 'Máximo 1000 caracteres.'),
  color: z.enum(STORY_COLORS),
  wordGoal: z.number('Escribe un número de palabras.').int('Escribe un número de palabras.').min(100, 'Mínimo 100 palabras.').max(1_000_000, 'Es demasiado grande.').nullable(),
}

// "Nueva historia o cuaderno" (EscritosInicio). La meta de palabras es opcional: sin meta no hay barra de avance.
export const storySchema = z.object(storyFields)

export type StoryInput = z.infer<typeof storySchema>

// Lo que recibe la API al crear: el formulario más el mundo donde vive (null = suelta, sin mundo) y, si se crea
// como idea desde la pestaña Historias de un mundo, su estado. Lo pone la pantalla según desde dónde se crea.
export const storyCreateSchema = z.object({ ...storyFields, worldId: z.uuid().nullable(), status: z.enum(STORY_STATUSES).optional() })

export type StoryCreateInput = z.infer<typeof storyCreateSchema>

export const storyArcSchema = z.object({ id: z.uuid(), name: z.string().trim().min(1, 'Ponle un nombre al arco.').max(60, 'Máximo 60 caracteres.') })

export type StoryArcInput = z.infer<typeof storyArcSchema>

// Un enlace del material de la historia ("Página de la historia", "Playlist en Spotify"). Solo http(s).
export const storyResourceSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, 'Ponle un nombre al enlace.').max(80, 'Máximo 80 caracteres.'),
  url: z.url({ protocol: /^https?$/, hostname: z.regexes.domain, error: 'Ese enlace no se ve completo. Empieza con https://' }).max(2048, 'El enlace es demasiado largo.'),
})

export type StoryResourceInput = z.infer<typeof storyResourceSchema>

// Lo que se edita de una historia desde su pestaña: datos, era y lugar, arcos, elenco y material.
export const storyUpdateSchema = z
  .object({
    title: storyFields.title.optional(),
    summary: storyFields.summary.optional(),
    color: storyFields.color.optional(),
    wordGoal: storyFields.wordGoal.optional(),
    status: z.enum(STORY_STATUSES).optional(),
    eraId: z.uuid().nullable().optional(),
    placeId: z.uuid().nullable().optional(),
    arcs: z
      .array(storyArcSchema)
      .max(30, 'Máximo 30 arcos.')
      .refine((arcs) => new Set(arcs.map((item) => item.id)).size === arcs.length, 'Hay arcos repetidos.')
      .optional(),
    cast: idList(200).optional(),
    resources: z.array(storyResourceSchema).max(30, 'Máximo 30 enlaces.').optional(),
  })
  .refine(notEmpty, notEmptyIssue)

export type StoryUpdateInput = z.infer<typeof storyUpdateSchema>

// --- Páginas ----------------------------------------------------------------------------------------------

// "+ Capítulo", "+ Página" o "Nota nueva". Un capítulo o una página de cuaderno van dentro de una historia; una
// nota rápida, sin historia. Que la historia sea del tipo correcto lo revisa la API.
export const pageCreateSchema = z
  .object({
    kind: z.enum(PAGE_KINDS),
    storyId: z.uuid().nullable(),
    title: z.string().trim().max(MAX_PAGE_TITLE, `Máximo ${MAX_PAGE_TITLE} caracteres.`),
  })
  .refine((page) => (page.kind === 'note') === (page.storyId === null), { path: ['storyId'], error: 'Una nota va suelta; un capítulo o página, dentro de una historia.' })

export type PageCreateInput = z.infer<typeof pageCreateSchema>

// Lo que guarda el editor (Pagina.dc.html): el título, el estado, la etiqueta (solo las notas la usan) y el
// contenido. Se guarda solo, unos instantes después de dejar de escribir; el número de palabras NO viaja, lo
// calcula quien guarda.
export const pageSaveSchema = z.object({
  title: z.string().trim().max(MAX_PAGE_TITLE, `Máximo ${MAX_PAGE_TITLE} caracteres.`),
  status: z.enum(PAGE_STATUSES),
  tag: z.string().trim().max(30, 'Máximo 30 caracteres.').nullable(),
  content: tiptapDocSchema,
})

export type PageSaveInput = z.infer<typeof pageSaveSchema>

// Los campos fijos de un capítulo (decisión #45: un capítulo no usa plantilla editable): su arco, su era y desde
// los ojos de quién se cuenta. `arcId` es uno de `stories.arcs`.
export const chapterMetaSchema = z
  .object({
    arcId: z.uuid().nullable().optional(),
    eraId: z.uuid().nullable().optional(),
    povCharacterId: z.uuid().nullable().optional(),
  })
  .refine(notEmpty, notEmptyIssue)

export type ChapterMetaInput = z.infer<typeof chapterMetaSchema>

// --- Palabras escritas -------------------------------------------------------------------------------------

// Desde qué día pedir las palabras escritas (la gráfica de la semana).
export const writingDaysQuerySchema = z.object({ from: z.iso.date() })
