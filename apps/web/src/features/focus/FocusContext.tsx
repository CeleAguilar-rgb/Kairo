'use client'

import { createContext, useContext, useEffect, useEffectEvent, useMemo, useState, type ReactNode } from 'react'

import { useToast } from '@/components/ui/Toast'

import { recordFocusSessionAction } from './actions'
import { FOCUS_SONGS } from './mock'
import type { FocusMode, FocusTask } from './types'
import { useFocusTimer } from './use-focus-timer'
import { FocusPlayer } from './components/FocusPlayer'

type FocusContextValue = {
  mode: FocusMode
  setMode: (mode: FocusMode) => void
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  // El título de la tarea en la que se enfoca ("" si no hay ninguna).
  task: string
  cycleTask: () => void
  // Para que otro módulo (el botón "Pomodoro" del detalle de tarea o de un bloque de la rutina) abra el
  // reproductor ya enfocado en algo, sin importar sus archivos internos — solo este hook (docs/guides/modules.md).
  // Con `id` el tiempo se le guarda a esa tarea; sin él (un texto suelto) solo se guarda el tiempo.
  focusOnTask: (task: FocusTask) => void
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

type FocusProviderProps = {
  children: ReactNode
  // Los pomodoros de trabajo que ya van hoy y las tareas en las que se puede enfocar, de la API (getFocusSetup).
  sessionsToday: number
  tasks: FocusTask[]
}

// El reproductor flotante como contexto: vive montado una sola vez en el
// layout del dashboard (sobrevive a cambiar de pantalla, igual que
// ToastProvider/DoodlesProvider) y expone useFocus() para que otros módulos
// — como el botón "Pomodoro" de Tareas — puedan abrirlo y enfocarlo en algo.
// Cada tramo que termina (trabajo o descanso) se guarda en la API.
export function FocusProvider({ children, sessionsToday, tasks }: FocusProviderProps) {
  const toast = useToast()
  const timer = useFocusTimer(sessionsToday)
  const [mode, setMode] = useState<FocusMode>('focus')
  const [expanded, setExpanded] = useState(false)
  const [taskIndex, setTaskIndex] = useState(0)
  const [custom, setCustom] = useState<FocusTask | null>(null)
  const [withMusic, setWithMusic] = useState(true)
  const [songIndex, setSongIndex] = useState(0)
  const [playing, setPlaying] = useState(true)

  const current = custom ?? tasks[taskIndex] ?? null

  // Guardar el tramo que acaba de terminar, con la tarea de ese momento. useEffectEvent: el efecto depende solo de
  // que terminó uno nuevo (`seq`) y no se vuelve a disparar al cambiar de tarea.
  const save = useEffectEvent((done: NonNullable<typeof timer.state.lastCompleted>) => {
    void recordFocusSessionAction({ kind: done.kind, startedAt: done.startedAt, minutes: done.minutes, taskId: current?.id ?? null }).then((result) => {
      if (!result.ok) toast.show({ message: result.message, icon: 'info' })
    })
  })
  const completed = timer.state.lastCompleted
  useEffect(() => {
    if (completed) save(completed)
  }, [completed])

  const api = useMemo<FocusContextValue>(
    () => ({
      mode,
      setMode,
      expanded,
      setExpanded,
      task: current?.title ?? '',
      cycleTask: () => {
        setCustom(null)
        setTaskIndex((index) => (tasks.length === 0 ? 0 : (index + 1) % tasks.length))
      },
      focusOnTask: (task) => {
        setCustom(task)
        setMode('focus')
        setExpanded(true)
      },
      withMusic,
      toggleWithMusic: () => setWithMusic((value) => !value),
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
      togglePlay: () => setPlaying((value) => !value),
      nextSong: () => setSongIndex((index) => (index + 1) % FOCUS_SONGS.length),
      prevSong: () => setSongIndex((index) => (index + FOCUS_SONGS.length - 1) % FOCUS_SONGS.length),
      playPlaylist: () => {
        setSongIndex(0)
        setPlaying(true)
      },
    }),
    [mode, expanded, current, tasks.length, withMusic, timer, songIndex, playing],
  )

  return (
    <FocusContext.Provider value={api}>
      {children}
      <FocusPlayer />
    </FocusContext.Provider>
  )
}
