import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// false en el servidor y durante la hidratación, true después. Para lo que solo
// existe en el navegador (portales a document.body, la hora local): así el HTML
// del servidor y el primer render del cliente coinciden.
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
