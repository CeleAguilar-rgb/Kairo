'use client'

import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react'

import GeneralLoading from '@/components/layout/GeneralLoading'
import styles from './Navigation.module.css'

// Next.js solo cambia de página cuando ya tiene la respuesta del servidor. En ese
// rato (decenas o cientos de ms, y en desarrollo hasta segundos si la ruta se está
// compilando) la app parecería no haber notado el clic. Aquí detectamos el clic en
// cualquier enlace interno para reaccionar al instante, en dos pasos:
//   1. De inmediato: el nav mueve su píldora y la página actual se atenúa.
//   2. Si pasan LOADER_DELAY_MS y la página nueva no llega: se cambia por la pantalla de
//      carga general (GeneralLoading), sin esperar al servidor.
type PendingNavigation = { href: string; from: string }
type NavigationState = { pendingHref: string | null; loaderVisible: boolean }

const NavigationContext = createContext<NavigationState>({ pendingHref: null, loaderVisible: false })

// Si la navegación nunca llega (fallo de red, la persona cancela), dejamos de
// fingir que está en curso para no dejar la pantalla atenuada para siempre.
const GIVE_UP_MS = 10_000

// Cuánto se espera antes de mostrar la pantalla de carga. Si la página llega en menos
// (lo normal en producción, donde Next precarga las rutas), nunca se ve y no parpadea.
const LOADER_DELAY_MS = 100

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [pending, setPending] = useState<PendingNavigation | null>(null)
  const [loaderShown, setLoaderShown] = useState(false)
  const giveUp = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const loaderTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleClick = useEffectEvent((event: MouseEvent) => {
    // Clic normal: con Ctrl/Cmd/Shift se abre en otra pestaña o ventana, no navega aquí.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!(anchor instanceof HTMLAnchorElement)) return
    if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return

    const url = new URL(anchor.href, window.location.href)
    if (url.origin !== window.location.origin || url.pathname === pathname) return

    setPending({ href: url.pathname, from: pathname })
    setLoaderShown(false)
    clearTimeout(giveUp.current)
    giveUp.current = setTimeout(() => setPending(null), GIVE_UP_MS)
    clearTimeout(loaderTimer.current)
    loaderTimer.current = setTimeout(() => setLoaderShown(true), LOADER_DELAY_MS)
  })

  useEffect(() => {
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      clearTimeout(giveUp.current)
      clearTimeout(loaderTimer.current)
    }
  }, [])

  // "En curso" mientras la ruta siga siendo la de origen. En cuanto cambia el
  // pathname termina solo, sin tener que limpiar nada a mano.
  const pendingHref = pending && pending.from === pathname ? pending.href : null
  const value = useMemo(
    () => ({ pendingHref, loaderVisible: pendingHref !== null && loaderShown }),
    [pendingHref, loaderShown],
  )

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

// Ruta a la que se está navegando, o null si no hay navegación en curso.
export function usePendingHref() {
  return useContext(NavigationContext).pendingHref
}

// Envuelve el contenido de la página. Mientras se espera la siguiente, la actual se
// atenúa y baja un poco (la "salida" que Next.js no anima por sí solo); si tarda, se
// cambia por la pantalla de carga general. La página vieja se OCULTA, no se desmonta:
// así el router de Next sigue montado y la navegación no se entera.
export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  const { pendingHref, loaderVisible } = useContext(NavigationContext)
  return (
    // Con la pantalla de carga visible ya no se atenúa el contenedor: la carga entra con su
    // propio fundido, y si además estuviera atenuada se verían dos fundidos multiplicados.
    <div className={className} data-pending={pendingHref && !loaderVisible ? '' : undefined}>
      {loaderVisible ? (
        <div className={styles.loaderIn}>
          <GeneralLoading />
        </div>
      ) : null}
      <div hidden={loaderVisible}>{children}</div>
    </div>
  )
}
