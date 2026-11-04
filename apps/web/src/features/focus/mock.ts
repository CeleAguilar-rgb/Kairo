import type { FocusPreset } from './types'

// Los mismos tres presets del canvas (Reproductor.dc.html): minutos de
// trabajo y de descanso de cada uno.
export const FOCUS_PRESETS: FocusPreset[] = [
  { workMinutes: 25, breakMinutes: 5 },
  { workMinutes: 50, breakMinutes: 10 },
  { workMinutes: 15, breakMinutes: 3 },
]

// Los pomodoros que ya van hechos hoy en el modo demo (el canvas arranca con 1 de 4).
export const FOCUS_DEMO_SESSIONS_TODAY = 1

// "Enfocado en {{task}}": tareas de ejemplo del modo demo. Con la API, las tareas
// salen de la lista real de Tareas (api.ts, getFocusSetup).
export const FOCUS_TASK_OPTIONS = [
  'Revisar requisitos de inscripción',
  'Terminar el diseño del dashboard',
  'Escribir la escena 2',
]
