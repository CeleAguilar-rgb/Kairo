// Constantes de la agenda, SIN zod a propósito (igual que tasks/constants.ts): el front las
// importa para pintar opciones y filtros sin descargar la librería de validación.

// 'school' (Escuela) está en el formulario "Nuevo evento" del canvas (EventoNuevo.dc.html); el enum
// de Postgres lo suma con su migración cuando se haga el módulo de agenda en la API.
export const EVENT_KINDS = ['work', 'personal', 'school'] as const
export type EventKind = (typeof EVENT_KINDS)[number]

// Cómo se repite un evento ("Repetir" del formulario). El modelo de datos todavía no tiene una
// columna para esto: se decide al hacer el backend de la agenda.
export const EVENT_REPEATS = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'] as const
export type EventRepeat = (typeof EVENT_REPEATS)[number]

// Cuánto antes del evento llega el recordatorio ("Aviso" del formulario).
export const EVENT_REMINDERS = ['none', '10m', '1h', '1d'] as const
export type EventReminder = (typeof EVENT_REMINDERS)[number]

// Al borrar un evento que se repite: solo esa vez, esa y las siguientes, o toda la serie.
export const EVENT_DELETE_SCOPES = ['one', 'next', 'all'] as const
export type EventDeleteScope = (typeof EVENT_DELETE_SCOPES)[number]
