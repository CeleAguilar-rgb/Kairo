// Constantes de Día a día, SIN zod a propósito (igual que tasks/constants.ts y agenda/constants.ts): el
// front las importa para pintar opciones sin descargar la librería de validación.

// "Clase" de un bloque de la rutina (RutinaEditar.dc.html): un hábito se marca con un check, una comida
// muestra el platillo del menú, el enfoque muestra la siguiente tarea de lo que elijas, y lo libre solo
// ocupa su espacio (Trabajo, por ejemplo) y no cuenta para el reporte.
export const ROUTINE_KINDS = ['habit', 'meal', 'focus', 'free'] as const
export type RoutineKind = (typeof ROUTINE_KINDS)[number]

// Íconos que se pueden elegir para un bloque.
export const ROUTINE_ICONS = ['sun', 'drop', 'pill', 'food', 'cap', 'code', 'pen', 'work', 'moon'] as const
export type RoutineIcon = (typeof ROUTINE_ICONS)[number]

// "Si no lo marco, insistir": minutos después de la hora del bloque en que vuelve a avisar. 0 = no insistir.
export const ROUTINE_NAGS = [0, 15, 30, 60] as const
export type RoutineNag = (typeof ROUTINE_NAGS)[number]

// Una rutina dice en qué días aplica con 7 casillas, de lunes (0) a domingo (6), sin importar con qué
// día empiece la semana el perfil (docs/guides/data-model.md: `routines.days`).
export const ROUTINE_DAYS_COUNT = 7

export const MEALS = ['breakfast', 'lunch', 'dinner'] as const
export type Meal = (typeof MEALS)[number]

// Ánimo del diario: de 0 (muy mal) a 4 (muy bien).
export const MOOD_LEVELS = [0, 1, 2, 3, 4] as const
export type MoodLevel = (typeof MOOD_LEVELS)[number]

// Etiquetas de una entrada del diario.
export const JOURNAL_TAGS = ['work', 'school', 'projects', 'friends', 'family', 'health', 'writing'] as const
export type JournalTag = (typeof JOURNAL_TAGS)[number]

// Áreas de una meta y cómo se mide (Metas.dc.html).
export const GOAL_AREAS = ['work', 'personal', 'school', 'health', 'money'] as const
export type GoalArea = (typeof GOAL_AREAS)[number]

// milestones = logro por hitos · number = llegar a una cantidad · habit = sale de un bloque de la rutina ·
// project = sale del avance de un proyecto.
export const GOAL_KINDS = ['milestones', 'number', 'habit', 'project'] as const
export type GoalKind = (typeof GOAL_KINDS)[number]

export const GOAL_STATUSES = ['active', 'done', 'paused'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]
