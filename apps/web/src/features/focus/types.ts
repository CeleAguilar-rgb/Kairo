// El modo del reproductor flotante (Reproductor.dc.html). Música (Spotify)
// llega en un paso aparte; este primer paso es solo Enfoque.
export type FocusMode = 'music' | 'focus'

export type FocusPhase = 'work' | 'break'

// Minutos de trabajo y de descanso de cada preset (25/5, 50/10, 15/3 en el canvas).
export type FocusPreset = {
  workMinutes: number
  breakMinutes: number
}

// El estado del pomodoro en sí, sin lo puramente visual (modo, expandido).
export type FocusTimerState = {
  presetIndex: number
  phase: FocusPhase
  secondsLeft: number
  running: boolean
  // Pomodoros de trabajo completados hoy, 0 a 4 (los puntos del canvas).
  sessionsToday: number
}
