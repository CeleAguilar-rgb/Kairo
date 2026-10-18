'use client'

import { usePathname } from 'next/navigation'
import { createContext, useContext, useState, type ReactNode } from 'react'

import { usePendingTabSwitch } from '@/components/layout/Navigation'

import styles from './SectionPanel.module.css'

// Dice si la pantalla que se está montando llegó por un cambio de pestaña dentro de la sección (no al
// entrar a la sección desde otra). Las vistas lo leen con `useCalmEntry` para no repetir su entrada de
// siempre (subir con cascada) y quedarse en un fundido corto: se siente la misma pantalla, no otra.
const CalmEntryContext = createContext(false)

// true si esta vista se montó después de cambiar de pestaña. Va en `initial` de Motion:
// `initial={calm ? false : 'hidden'}` hace que la vista nazca ya en su estado final. Solo se lee al
// montar; lo que se agrega después (una meta nueva) sigue entrando con su animación propia.
export function useCalmEntry() {
  return useContext(CalmEntryContext)
}

type SectionPanelProps = {
  children: ReactNode
  className?: string
}

// El contenido que cambia al elegir una pestaña (lo de abajo de la cabecera y las pestañas, que no se
// mueven). Hace dos cosas:
//  1. Mientras llega la pestaña elegida, atenúa el contenido viejo (solo si tarda: ver el CSS).
//  2. Al llegar la nueva, la muestra con un fundido corto, sin subir ni escalonar.
// La primera pantalla que se ve al entrar a la sección conserva su entrada de siempre (`navigated` aún
// es false): el fundido calmado es solo para los cambios de pestaña.
export function SectionPanel({ children, className }: SectionPanelProps) {
  const pathname = usePathname()
  const switching = usePendingTabSwitch()
  // Cuando la ruta cambia, ya hubo un cambio de pestaña. Se anota en el render (patrón de "guardar lo del
  // render anterior", igual que NavigationProvider): así la pestaña nueva nace ya sabiendo que es calmada.
  const [lastPathname, setLastPathname] = useState(pathname)
  const [navigated, setNavigated] = useState(false)
  if (lastPathname !== pathname) {
    setLastPathname(pathname)
    setNavigated(true)
  }

  return (
    <CalmEntryContext.Provider value={navigated}>
      {/* `key` por ruta: cada pestaña es un elemento nuevo y su fundido de entrada arranca de nuevo. */}
      <div
        key={pathname}
        className={[styles.panel, className].filter(Boolean).join(' ')}
        data-calm={navigated ? '' : undefined}
        data-switching={switching ? '' : undefined}
      >
        {children}
      </div>
    </CalmEntryContext.Provider>
  )
}
