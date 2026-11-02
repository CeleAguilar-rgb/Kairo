import type { FocusKind } from '@kairo/shared'

// El modo del reproductor flotante (Reproductor.dc.html). Música (Spotify)
// llega en un paso aparte; este primer paso es solo Enfoque.
export type FocusMode = 'music' | 'focus'

export type FocusPhase = FocusKind

// Minutos de trabajo y de descanso de cada preset (25/5, 50/10, 15/3 en el canvas).
export type FocusPreset = {
  workMinutes: number
  breakMinutes: number
}

// Un tramo del pomodoro que terminó, para guardarlo (la API lo recibe en `POST /focus/sessions`).
export type FocusCompleted = {
  // Se incrementa con cada tramo terminado: así el efecto que guarda sabe que es uno nuevo aunque sea igual al anterior.
  seq: number
  kind: FocusPhase
  startedAt: string
  minutes: number
}

// El estado del pomodoro en sí, sin lo puramente visual (modo, expandido).
export type FocusTimerState = {
  presetIndex: number
  phase: FocusPhase
  secondsLeft: number
  running: boolean
  // Pomodoros de trabajo completados hoy, 0 a 4 (los puntos del canvas).
  sessionsToday: number
  // Cuándo (ms) empezó el tramo en curso; null si todavía no arranca (o se reinició).
  startedAtMs: number | null
  lastCompleted: FocusCompleted | null
}

// La tarea en la que se enfoca: una real (con id, para guardar a qué tarea se le dedicó el tiempo) o un texto
// suelto (por ejemplo el siguiente pendiente de un bloque de la rutina, que todavía no es una tarea de verdad).
export type FocusTask = { id: string | null; title: string }

// Una sesión como la devuelve la API.
export type FocusSessionRecord = { id: string; kind: FocusKind; startedAt: string; minutes: number; taskId: string | null }
