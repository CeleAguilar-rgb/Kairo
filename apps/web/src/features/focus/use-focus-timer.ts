'use client'

import { useEffect, useReducer } from 'react'

import { FOCUS_MAX_SESSIONS, FOCUS_PRESETS } from './mock'
import type { FocusPhase, FocusTimerState } from './types'

type FocusTimerAction =
  | { type: 'tick' }
  | { type: 'toggleRun' }
  | { type: 'reset' }
  | { type: 'skipToBreak' }
  | { type: 'choosePreset'; presetIndex: number }

const initialState: FocusTimerState = {
  presetIndex: 0,
  phase: 'work',
  secondsLeft: FOCUS_PRESETS[0].workMinutes * 60,
  running: false,
  sessionsToday: 0,
}

// Cuántos segundos dura la fase `phase` del preset `presetIndex`.
function durationFor(presetIndex: number, phase: FocusPhase) {
  const preset = FOCUS_PRESETS[presetIndex]
  return (phase === 'work' ? preset.workMinutes : preset.breakMinutes) * 60
}

function focusTimerReducer(state: FocusTimerState, action: FocusTimerAction): FocusTimerState {
  switch (action.type) {
    case 'tick': {
      if (state.secondsLeft <= 1) {
        // Se acaba la fase: para el cronómetro: un pomodoro de trabajo
        // terminado cuenta para los puntos del día (hasta el máximo).
        return {
          ...state,
          secondsLeft: 0,
          running: false,
          sessionsToday: state.phase === 'work' ? Math.min(FOCUS_MAX_SESSIONS, state.sessionsToday + 1) : state.sessionsToday,
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
        return { ...state, running: true, phase: nextPhase, secondsLeft: durationFor(state.presetIndex, nextPhase) }
      }
      return { ...state, running: true }
    }

    case 'reset':
      return { ...state, running: false, phase: 'work', secondsLeft: durationFor(state.presetIndex, 'work') }

    case 'skipToBreak':
      return { ...state, running: false, phase: 'break', secondsLeft: durationFor(state.presetIndex, 'break') }

    case 'choosePreset':
      return { ...state, presetIndex: action.presetIndex, running: false, phase: 'work', secondsLeft: durationFor(action.presetIndex, 'work') }

    default:
      return state
  }
}

// El pomodoro como hook: un solo reducer con su cronómetro de verdad (un
// segundo real, no simulado). Vive en el componente que lo monta una vez en
// el layout del dashboard — por eso sigue corriendo al cambiar de pantalla.
export function useFocusTimer() {
  const [state, dispatch] = useReducer(focusTimerReducer, initialState)

  useEffect(() => {
    if (!state.running) return
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(id)
  }, [state.running])

  return {
    state,
    toggleRun: () => dispatch({ type: 'toggleRun' }),
    reset: () => dispatch({ type: 'reset' }),
    skipToBreak: () => dispatch({ type: 'skipToBreak' }),
    choosePreset: (presetIndex: number) => dispatch({ type: 'choosePreset', presetIndex }),
  }
}
