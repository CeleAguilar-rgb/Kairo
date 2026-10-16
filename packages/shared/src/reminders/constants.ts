// Constantes de recordatorios, SIN zod a propósito (igual que tasks/constants.ts y
// agenda/constants.ts): el front las importa para pintar opciones sin descargar la librería de validación.

// "Repetir" del formulario de Recordatorios (Recordatorios.dc.html). El modelo de datos todavía no tiene
// una columna para esto: se decide al hacer el backend de recordatorios.
export const REMINDER_REPEATS = ['none', 'daily', 'weekdays'] as const
export type ReminderRepeat = (typeof REMINDER_REPEATS)[number]

// "Posponer" de cada recordatorio: en 10 minutos, en 1 hora o para mañana.
export const REMINDER_SNOOZES = ['10m', '1h', 'tomorrow'] as const
export type ReminderSnooze = (typeof REMINDER_SNOOZES)[number]

// De dónde viene un recordatorio. Los que no son 'manual' los crean otros módulos (el aviso de un
// evento, el cobro de una membresía, una tarea con fecha, un bloque de la rutina).
export const REMINDER_SOURCE_KINDS = ['manual', 'routine', 'event', 'membership', 'task'] as const
export type ReminderSourceKind = (typeof REMINDER_SOURCE_KINDS)[number]
