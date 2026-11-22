'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

// La acción principal de la pantalla ("Nuevo evento", "Movimiento", "Agregar membresía"…). Cada pantalla que crea
// algo la declara con `usePageAction` (o con un AddButton, que lo hace por dentro) y el "+" flotante del teléfono
// la ejecuta en vez de abrir la captura rápida. Sin acción declarada, el "+" abre la captura como siempre.
export type PageAction = {
  label: string
  run: () => void
  // Adelanta la carga de lo que abre la acción (un cajón que se carga bajo demanda).
  preload?: () => void
}

// Dos contextos a propósito: quien registra (las pantallas) no debe volver a pintarse cada vez que cambia la
// acción activa; solo el "+" necesita leerla.
const RegisterContext = createContext<((action: PageAction) => () => void) | null>(null)
const CurrentContext = createContext<PageAction | null>(null)

export function PageActionProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<PageAction | null>(null)

  // Devuelve la función que la quita. Al cambiar de pestaña la nueva se registra antes de que la vieja termine
  // de salir, así que solo se quita si sigue siendo la misma (si no, borraría a la nueva).
  const register = useCallback((action: PageAction) => {
    setCurrent(action)
    return () => setCurrent((now) => (now === action ? null : now))
  }, [])

  return (
    <RegisterContext.Provider value={register}>
      <CurrentContext.Provider value={current}>{children}</CurrentContext.Provider>
    </RegisterContext.Provider>
  )
}

// La acción de la pantalla en este momento (la lee el "+" flotante). null si ninguna pantalla declaró una.
export function useCurrentPageAction() {
  return useContext(CurrentContext)
}

// Declara la acción de la pantalla mientras el componente está montado. `run` y `preload` pueden cambiar en cada
// render (usan estado de la pantalla): se guardan en una referencia para no registrar de nuevo cada vez, y solo
// el texto vuelve a registrar.
export function usePageAction(label: string, run: () => void, preload?: () => void) {
  const register = useContext(RegisterContext)
  const latest = useRef({ run, preload })

  useEffect(() => {
    latest.current = { run, preload }
  })

  useEffect(() => {
    if (!register) return
    return register({ label, run: () => latest.current.run(), preload: () => latest.current.preload?.() })
  }, [register, label])
}
