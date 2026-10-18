export const ASSIGNMENT_KINDS = ['task', 'project', 'exam', 'reading'] as const
export type AssignmentKind = (typeof ASSIGNMENT_KINDS)[number]

// Los mismos 5 colores de Finanzas (ink/lavender/sand/lavender_soft) más "peach"
// (Durazno), para las materias (Escuela.dc.html).
export const SUBJECT_COLORS = ['lavender', 'ink', 'sand', 'lavender_soft', 'peach'] as const
export type SubjectColor = (typeof SUBJECT_COLORS)[number]

// Lunes a sábado: las clases de Escuela no incluyen domingo (Escuela.dc.html).
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export type Weekday = (typeof WEEKDAYS)[number]
