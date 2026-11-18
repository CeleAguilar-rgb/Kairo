import { useSyncExternalStore } from 'react'

// El mismo corte que usa el CSS para el teléfono (@media (max-width: 720px)).
const QUERY = '(max-width: 720px)'

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

// true en pantallas de teléfono. En el servidor y durante la hidratación vale false (como useMounted), así
// el HTML coincide; justo después se corrige, y si la ventana cambia de tamaño también. Sirve para elegir
// un valor POR DEFECTO (Tareas abre en Lista, Agenda en Día), nunca para esconder cosas: eso es del CSS.
export function useNarrowScreen() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
