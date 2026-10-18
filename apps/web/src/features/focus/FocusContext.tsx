'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import { FOCUS_SONGS, FOCUS_TASK_OPTIONS } from './mock'
import type { FocusMode } from './types'
import { useFocusTimer } from './use-focus-timer'
import { FocusPlayer } from './components/FocusPlayer'

type FocusContextValue = {
  mode: FocusMode
  setMode: (mode: FocusMode) => void
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  task: string
  cycleTask: () => void
  // Para que otro módulo (el botón "Pomodoro" del detalle de tarea) abra el
  // reproductor ya enfocado en una tarea real, sin importar sus archivos
  // internos — solo este hook (docs/guides/modules.md).
  focusOnTask: (title: string) => void
  withMusic: boolean
  toggleWithMusic: () => void
  timer: ReturnType<typeof useFocusTimer>
  song: { title: string; playlist: string }
  playing: boolean
  togglePlay: () => void
  nextSong: () => void
  prevSong: () => void
  playPlaylist: (index: number) => void
}

const FocusContext = createContext<FocusContextValue | null>(null)

export function useFocus() {
  const context = useContext(FocusContext)
  if (!context) throw new Error('useFocus() necesita estar dentro de <FocusProvider>.')
  return context
}

// El reproductor flotante como contexto: vive montado una sola vez en el
// layout del dashboard (sobrevive a cambiar de pantalla, igual que
// ToastProvider/DoodlesProvider) y expone useFocus() para que otros módulos
// — como el botón "Pomodoro" de Tareas — puedan abrirlo y enfocarlo en algo.
export function FocusProvider({ children }: { children: ReactNode }) {
  const timer = useFocusTimer()
  const [mode, setMode] = useState<FocusMode>('focus')
  const [expanded, setExpanded] = useState(false)
  const [taskIndex, setTaskIndex] = useState(0)
  const [customTask, setCustomTask] = useState<string | null>(null)
  const [withMusic, setWithMusic] = useState(true)
  const [songIndex, setSongIndex] = useState(0)
  const [playing, setPlaying] = useState(true)

  const task = customTask ?? FOCUS_TASK_OPTIONS[taskIndex]

  const api = useMemo<FocusContextValue>(
    () => ({
      mode,
      setMode,
      expanded,
      setExpanded,
      task,
      cycleTask: () => {
        setCustomTask(null)
        setTaskIndex((current) => (current + 1) % FOCUS_TASK_OPTIONS.length)
      },
      focusOnTask: (title) => {
        setCustomTask(title)
        setMode('focus')
        setExpanded(true)
      },
      withMusic,
      toggleWithMusic: () => setWithMusic((current) => !current),
      timer: {
        ...timer,
        toggleRun: () => {
          // Si vas a arrancar un pomodoro y "poner música al empezar" está
          // prendido, la música también arranca (Reproductor.dc.html:204).
          if (!timer.state.running && withMusic) setPlaying(true)
          timer.toggleRun()
        },
      },
      song: FOCUS_SONGS[songIndex],
      playing,
      togglePlay: () => setPlaying((current) => !current),
      nextSong: () => setSongIndex((current) => (current + 1) % FOCUS_SONGS.length),
      prevSong: () => setSongIndex((current) => (current + FOCUS_SONGS.length - 1) % FOCUS_SONGS.length),
      playPlaylist: () => {
        setSongIndex(0)
        setPlaying(true)
      },
    }),
    [mode, expanded, task, withMusic, timer, songIndex, playing],
  )

  return (
    <FocusContext.Provider value={api}>
      {children}
      <FocusPlayer />
    </FocusContext.Provider>
  )
}
