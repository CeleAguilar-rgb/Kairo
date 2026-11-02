'use client'

import { FOCUS_DOTS } from '@kairo/shared'
import { useEffect, useReducer } from 'react'

import { FOCUS_PRESETS } from './mock'
import type { FocusPhase, FocusTimerState } from './types'

type FocusTimerAction =
  // `now` lo pone quien despacha: un reducer no debe leer el reloj.
  | { type: 'tick'; now: number }
  | { type: 'toggleRun'; now: number }
  | { type: 'reset' }
  | { type: 'skipToBreak' }
  | { type: 'choosePreset'; presetIndex: number }

const initialState = (sessionsToday: number): FocusTimerState => ({
  presetIndex: 0,
  phase: 'work',
  secondsLeft: FOCUS_PRESETS[0].workMinutes * 60,
  running: false,
  sessionsToday,
  startedAtMs: null,
  lastCompleted: null,
})

// Cuántos segundos dura la fase `phase` del preset `presetIndex`.
function durationFor(presetIndex: number, phase: FocusPhase) {
  const preset = FOCUS_PRESETS[presetIndex]
  return (phase === 'work' ? preset.workMinutes : preset.breakMinutes) * 60
}

function focusTimerReducer(state: FocusTimerState, action: FocusTimerAction): FocusTimerState {
  switch (action.type) {
    case 'tick': {
      if (state.secondsLeft <= 1) {
        // Se acaba la fase: para el cronómetro. Un pomodoro de trabajo terminado cuenta para los puntos del día
        // (hasta el máximo), y el tramo completo queda listo para guardarse (`lastCompleted`).
        const minutes = durationFor(state.presetIndex, state.phase) / 60
        return {
          ...state,
          secondsLeft: 0,
          running: false,
          startedAtMs: null,
          sessionsToday: state.phase === 'work' ? Math.min(FOCUS_DOTS, state.sessionsToday + 1) : state.sessionsToday,
          lastCompleted: {
            seq: (state.lastCompleted?.seq ?? 0) + 1,
            kind: state.phase,
            startedAt: new Date(state.startedAtMs ?? action.now - minutes * 60_000).toISOString(),
            minutes,
          },
        }
      }
      return { ...state, secondsLeft: state.secondsLeft - 1 }
    }

    case 'toggleRun': {
      if (state.running) return { ...state, running: false }
      // Arrancar con la fase anterior ya en 0 (terminada): primero cambia
      // de fase y recarga el cronómetro con la duración de la fase nueva.
      if (state.secondsLeft === 0) {
        const nextPhase: FocusPhase = state.phase === 'work' ? 'break' : 'work'
        return { ...state, running: true, phase: nextPhase, secondsLeft: durationFor(state.presetIndex, nextPhase), startedAtMs: action.now }
      }
      // Reanudar una pausa conserva cuándo empezó el tramo; arrancar uno nuevo lo marca ahora.
      return { ...state, running: true, startedAtMs: state.startedAtMs ?? action.now }
    }

    case 'reset':
      return { ...state, running: false, phase: 'work', secondsLeft: durationFor(state.presetIndex, 'work'), startedAtMs: null }

    case 'skipToBreak':
      return { ...state, running: false, phase: 'break', secondsLeft: durationFor(state.presetIndex, 'break'), startedAtMs: null }

    case 'choosePreset':
      return { ...state, presetIndex: action.presetIndex, running: false, phase: 'work', secondsLeft: durationFor(action.presetIndex, 'work'), startedAtMs: null }

    default:
      return state
  }
}

// El pomodoro como hook: un solo reducer con su cronómetro de verdad (un
// segundo real, no simulado). Vive en el componente que lo monta una vez en
// el layout del dashboard — por eso sigue corriendo al cambiar de pantalla.
// `initialSessionsToday` son los pomodoros que ya se hicieron hoy (vienen de la API).
export function useFocusTimer(initialSessionsToday: number) {
  const [state, dispatch] = useReducer(focusTimerReducer, initialSessionsToday, initialState)

  useEffect(() => {
    if (!state.running) return
    const id = setInterval(() => dispatch({ type: 'tick', now: Date.now() }), 1000)
    return () => clearInterval(id)
  }, [state.running])

  return {
    state,
    toggleRun: () => dispatch({ type: 'toggleRun', now: Date.now() }),
    reset: () => dispatch({ type: 'reset' }),
    skipToBreak: () => dispatch({ type: 'skipToBreak' }),
    choosePreset: (presetIndex: number) => dispatch({ type: 'choosePreset', presetIndex }),
  }
}
