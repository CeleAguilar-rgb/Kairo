import { z } from 'zod'

import { FIELD_TYPES, MAX_PAGE_TITLE, PAGE_STATUSES, STORY_COLORS, STORY_KINDS } from './constants'
import { isValidTiptapDoc, type TiptapDoc } from './tiptap'

// Un id que llega de la pantalla. En los datos de ejemplo no son uuid (igual que en las demás secciones); con la
// API serán `z.uuid()` y cada consulta llevará `where: { id, userId }`. Se define aquí y no se importa de otro
// módulo: un módulo no se apoya en los archivos internos de otro.
export const writingIdSchema = z.string().min(1).max(64)

// El contenido de una página: JSON de Tiptap, revisado a fondo en ./tiptap (tipos de bloque permitidos,
// direcciones seguras, tamaño máximo). Un JSON que no pase esa revisión no se guarda.
export const tiptapDocSchema = z.custom<TiptapDoc>((value) => isValidTiptapDoc(value), 'Ese contenido no es válido.')

// --- Historias y cuadernos -------------------------------------------------------------------------

// "Nueva historia o cuaderno" (EscritosInicio). La meta de palabras es opcional: sin meta no hay barra de avance.
export const storySchema = z.object({
  title: z.string().trim().min(1, 'Ponle un título.').max(80, 'Máximo 80 caracteres.'),
  kind: z.enum(STORY_KINDS),
  summary: z.string().trim().max(300, 'Máximo 300 caracteres.'),
  color: z.enum(STORY_COLORS),
  wordGoal: z.number('Escribe un número de palabras.').int('Escribe un número de palabras.').min(100, 'Mínimo 100 palabras.').max(1_000_000, 'Es demasiado grande.').nullable(),
})

export type StoryInput = z.infer<typeof storySchema>

// --- Mundos ---------------------------------------------------------------------------------------

// "Nuevo mundo" (EscritosInicio): el nombre y de qué trata. Regiones, eras y especies se agregan después.
export const worldSchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre.').max(60, 'Máximo 60 caracteres.'),
  description: z.string().trim().max(400, 'Máximo 400 caracteres.'),
})

export type WorldInput = z.infer<typeof worldSchema>

// --- Páginas --------------------------------------------------------------------------------------

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

// --- Personajes -----------------------------------------------------------------------------------

// Lo que guarda el panel de un personaje (BaseDatos.dc.html): su nombre, su ficha escrita y el valor de cada
// columna. El valor de una columna de selección viaja como el texto de la opción ("Sudria"): si no existe, se crea.
// Que cada columna exista y que el valor sea del tipo de su columna lo revisa quien guarda, que conoce las columnas.
export const characterSchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre.').max(80, 'Máximo 80 caracteres.'),
  description: z.string().trim().max(2000, 'Máximo 2000 caracteres.'),
  values: z.record(writingIdSchema, z.union([z.string().trim().max(200, 'Máximo 200 caracteres.'), z.number().finite('Escribe un número.'), z.null()])),
})

export type CharacterInput = z.infer<typeof characterSchema>

// Agregar una columna ("Propiedad" en la base de personajes): solo se elige el tipo; el nombre se pone solo.
export const fieldTypeSchema = z.enum(FIELD_TYPES)
