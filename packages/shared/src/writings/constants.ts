// Constantes de Escritos, SIN zod a propósito (igual que finance/constants.ts): el front las importa para
// pintar opciones sin descargar la librería de validación.

// Una historia es un libro con capítulos; un cuaderno junta páginas sueltas (docs/guides/data-model.md:
// `stories.kind`). Las notas rápidas no pertenecen a ninguna de las dos.
export const STORY_KINDS = ['story', 'notebook'] as const
export type StoryKind = (typeof STORY_KINDS)[number]

// El color del lomo (EscritosInicio): tinta con letra dorada, lavanda y arena.
export const STORY_COLORS = ['ink', 'lavender', 'sand'] as const
export type StoryColor = (typeof STORY_COLORS)[number]

// En qué va una historia (Escritos.dc.html, pestaña Historias): una idea todavía, en curso o terminada. Las
// ideas salen con portada punteada y en el recuadro "Ideas" del Resumen.
export const STORY_STATUSES = ['idea', 'in_progress', 'done'] as const
export type StoryStatus = (typeof STORY_STATUSES)[number]

// Qué es una página (`pages.kind`): un capítulo de una historia, una nota rápida o una página suelta.
export const PAGE_KINDS = ['chapter', 'note', 'page'] as const
export type PageKind = (typeof PAGE_KINDS)[number]

// El estado de un capítulo: "Sin estado", "Pendiente", "En curso" y "Listo". El canvas solo muestra los tres
// primeros; "Listo" es lo natural al terminar.
export const PAGE_STATUSES = ['none', 'pending', 'in_progress', 'done'] as const
export type PageStatus = (typeof PAGE_STATUSES)[number]

// Los colores de una opción de selección (el Reino de un personaje, por ejemplo) y de una plantilla. Salen de
// las variables semánticas, no de un hex: "tinta", "lavanda", "lavanda suave", "arena" y "crema".
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

// --- Plantillas (note_templates, decisión #45) -------------------------------------------------------

// Las 3 plantillas de fábrica de un mundo: no se pueden borrar, solo renombrar y cambiar sus campos. Una
// plantilla sin `key` es una sección extra (Magia, Objetos…) con su propia pestaña.
export const NOTE_TEMPLATE_KEYS = ['character', 'species', 'place'] as const
export type NoteTemplateKey = (typeof NOTE_TEMPLATE_KEYS)[number]

// Un campo de plantilla es "de vista corta" (sale arriba y en la tarjeta) o "para rellenar" (una sección con
// una pregunta guía, se escribe en el cuerpo de la página). `note_templates.fields[].kind`.
export const FIELD_KINDS = ['field', 'section'] as const
export type FieldKind = (typeof FIELD_KINDS)[number]

// Los tipos de un campo de plantilla (`note_templates.fields[].type`, data-model.md): texto corto, vínculo a
// otro personaje o nota ("ficha" en el canvas), una era del mundo, selección de una lista, número o fecha.
// Solo tiene sentido en un campo `kind: 'field'`; uno `kind: 'section'` siempre es texto.
export const NOTE_TEMPLATE_FIELD_TYPES = ['text', 'link', 'era', 'select', 'number', 'date'] as const
export type NoteTemplateFieldType = (typeof NOTE_TEMPLATE_FIELD_TYPES)[number]

// Los campos que la app lee por su cuenta (el resto solo se muestra): `role` arma Protagonistas/Antagonistas del
// Resumen, `home` agrupa las especies por región y `place_type` dice si un lugar es región, reino, bosque…
export const TEMPLATE_FIELD_KEYS = ['role', 'home', 'place_type'] as const
export type TemplateFieldKey = (typeof TEMPLATE_FIELD_KEYS)[number]

// Las opciones de "Tipo de lugar" que la app reconoce por su id (no por el texto, que se puede renombrar):
// las regiones salen como tarjeta grande en Regiones y los reinos se cuentan aparte.
export const PLACE_TYPE_REGION = 'region'
export const PLACE_TYPE_KINGDOM = 'kingdom'

// Topes de una plantilla: cuántos campos y cuántas opciones de una selección.
export const MAX_TEMPLATE_FIELDS = 24
export const MAX_FIELD_OPTIONS = 40

// --- Pestañas y contadores de un mundo (worlds.tabs, worlds.stats, decisión #46) ------------------------

// Las pestañas fijas de un mundo. Las secciones extra son `tpl:<id de su plantilla>`. "Resumen" siempre está.
export const WORLD_CORE_TABS = ['resumen', 'timeline', 'regions', 'stories', 'characters', 'species'] as const
export type WorldCoreTab = (typeof WORLD_CORE_TABS)[number]

// Lo que se cuenta en la portada del mundo. Las secciones extra se cuentan como `tpl:<id>`.
export const WORLD_CORE_STATS = ['eras', 'events', 'regions', 'kingdoms', 'places', 'species', 'characters', 'stories', 'chapters'] as const
export type WorldCoreStat = (typeof WORLD_CORE_STATS)[number]

// Con `worlds.tabs` / `worlds.stats` nulos se usan estos (los del canvas).
export const DEFAULT_WORLD_STATS: readonly WorldCoreStat[] = ['eras', 'regions', 'kingdoms', 'species', 'characters']

// --- Portadas -----------------------------------------------------------------------------------------

// La portada de un personaje o nota (EscritosPortada.dc.html): el dibujo automático de su tipo, un color de la
// paleta, una imagen subida o ninguna.
export const COVER_MODES = ['auto', 'color', 'image', 'none'] as const
export type CoverMode = (typeof COVER_MODES)[number]

// Los 6 colores de portada del canvas: arena, lavanda suave, lavanda, salvia, calabaza y tinta.
export const COVER_COLORS = ['sand', 'lavender_soft', 'lavender', 'sage', 'peach', 'ink'] as const
export type CoverColor = (typeof COVER_COLORS)[number]

// Una imagen de portada se puede subir o bajar dentro de la franja: arriba, en medio o abajo.
export const COVER_POSITIONS = [0, 1, 2] as const
