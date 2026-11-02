// Constantes de Enfoque, SIN zod a propósito (igual que las demás): el reproductor las importa sin cargar la
// librería de validación.

// Una sesión de enfoque es un tramo de trabajo o de descanso del pomodoro (`focus_sessions.kind`).
export const FOCUS_KINDS = ['work', 'break'] as const
export type FocusKind = (typeof FOCUS_KINDS)[number]

// Los minutos de una sesión van de 1 a 180: el preset más largo del canvas es de 50, y el tope solo evita que
// un número enorme llegue a la base.
export const MAX_FOCUS_MINUTES = 180

// Cuántos puntos tiene la fila "sesiones de hoy" del reproductor (el canvas pinta 4).
export const FOCUS_DOTS = 4
