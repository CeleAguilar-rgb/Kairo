// Constantes de la Papelera, SIN zod a propósito (igual que las demás).

// Lo que puede aparecer en la Papelera (Papelera.dc.html). Cada tipo lo aporta su módulo con un adaptador
// (`<módulo>.trash.ts` en la API); la Papelera nunca lee sus tablas. Las partes internas de algo (subtareas,
// objetivos, enlaces, sprints y la materia de un proyecto, páginas de una historia…) no salen solas: se van y vuelven con su dueño.
// Las rutinas y sus bloques NO están: borrarlos para siempre se llevaría el historial del reporte (`routine_logs`),
// que data-model.md promete conservar; se quedan con su "Deshacer".
export const TRASH_KINDS = [
  'project',
  'attachment',
  'task',
  'event',
  'reminder',
  'goal',
  'journal_entry',
  'meal',
  'world',
  'note_template',
  'character',
  'world_note',
  'era',
  'world_event',
  'story',
  'page',
  'transaction',
  'membership',
  'card',
  'saving',
  'debt',
  'category',
] as const
export type TrashKind = (typeof TRASH_KINDS)[number]

// Los filtros de la pantalla: los cuatro del canvas más "Otros" (Agenda, Recordatorios y Día a día), para que nada
// borrado quede invisible 30 días.
export const TRASH_GROUPS = ['project', 'task', 'writing', 'finance', 'other'] as const
export type TrashGroup = (typeof TRASH_GROUPS)[number]

// Cuántos días se queda algo en la papelera antes de que la tarea programada lo borre para siempre.
export const TRASH_DAYS = 30
