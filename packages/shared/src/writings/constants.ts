// Constantes de Escritos, SIN zod a propósito (igual que finance/constants.ts): el front las importa para
// pintar opciones sin descargar la librería de validación.

// Una historia es un libro con capítulos; un cuaderno junta páginas sueltas (docs/guides/data-model.md:
// `stories.kind`). Las notas rápidas no pertenecen a ninguna de las dos.
export const STORY_KINDS = ['story', 'notebook'] as const
export type StoryKind = (typeof STORY_KINDS)[number]

// El color del lomo (EscritosInicio): tinta con letra dorada, lavanda y arena.
export const STORY_COLORS = ['ink', 'lavender', 'sand'] as const
export type StoryColor = (typeof STORY_COLORS)[number]

// Qué es una página (`pages.kind`): un capítulo de una historia, una nota rápida o una página suelta.
export const PAGE_KINDS = ['chapter', 'note', 'page'] as const
export type PageKind = (typeof PAGE_KINDS)[number]

// El estado de un capítulo: "Sin estado", "Pendiente", "En curso" y "Listo". El canvas solo muestra los tres
// primeros; "Listo" es lo natural al terminar y queda anotado en la nota de sesión para la migración.
export const PAGE_STATUSES = ['none', 'pending', 'in_progress', 'done'] as const
export type PageStatus = (typeof PAGE_STATUSES)[number]

// Los colores de una opción de selección (el Reino de un personaje, por ejemplo). Salen de las variables
// semánticas, no de un hex: "tinta", "lavanda", "lavanda suave", "arena" y "crema".
export const OPTION_TONES = ['ink', 'accent', 'soft', 'warm', 'muted'] as const
export type OptionTone = (typeof OPTION_TONES)[number]

// Meta de palabras por día mientras no existan los ajustes de Escritos (el canvas dice "meta 500 al día").
export const DEFAULT_DAILY_WORD_GOAL = 500

// Topes de lo que se guarda, para que una entrada enorme no llegue a la base de datos.
export const MAX_PAGE_TITLE = 120
export const MAX_DOC_NODES = 5000
export const MAX_DOC_DEPTH = 12
export const MAX_TEXT_LENGTH = 20_000
export const MAX_ATTR_LENGTH = 2000

// Los tipos de columna de la base de personajes (`character_fields.type`, data-model.md). El canvas ofrece también
// "Casilla", "Relación" y "Archivo": quedan fuera hasta que el modelo de datos los incluya (nota de sesión).
export const FIELD_TYPES = ['text', 'select', 'number', 'date'] as const
export type FieldType = (typeof FIELD_TYPES)[number]
