import type { FocusPreset } from './types'

// Los mismos tres presets del canvas (Reproductor.dc.html): minutos de
// trabajo y de descanso de cada uno.
export const FOCUS_PRESETS: FocusPreset[] = [
  { workMinutes: 25, breakMinutes: 5 },
  { workMinutes: 50, breakMinutes: 10 },
  { workMinutes: 15, breakMinutes: 3 },
]

// El máximo de sesiones que cuentan los puntos del día (el canvas también usa 4).
export const FOCUS_MAX_SESSIONS = 4

// "Enfocado en {{task}}": tareas de ejemplo para probar el botón "Cambiar".
// Igual que en el canvas, es una lista fija por ahora — cuando exista el
// backend de Enfoque, esto se pide al service de Tareas (docs/guides/modules.md),
// nunca importando sus archivos internos.
export const FOCUS_TASK_OPTIONS = [
  'Revisar requisitos de inscripción',
  'Terminar el diseño del dashboard',
  'Escribir la escena 2',
]

export type FocusSong = { title: string; playlist: string }

// El modo Música: Spotify de verdad es fase posterior (docs/guides/features.md),
// esto es solo para que el front se sienta completo mientras tanto.
export const FOCUS_SONGS: FocusSong[] = [
  { title: 'Canción de ejemplo', playlist: 'Para enfocarme' },
  { title: 'Otra canción', playlist: 'Para enfocarme' },
  { title: 'Tercera canción', playlist: 'Para enfocarme' },
]

export type FocusPlaylist = { name: string; description: string }

export const FOCUS_PLAYLISTS: FocusPlaylist[] = [
  { name: 'Para enfocarme', description: '42 canciones · instrumental' },
  { name: 'Lofi para estudiar', description: 'De Spotify' },
  { name: 'Tus favoritas', description: '318 canciones' },
]
