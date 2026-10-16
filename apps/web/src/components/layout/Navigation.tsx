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
// Excepción: el clic en una pestaña (un enlace dentro de un elemento con `data-tab-switch`, como las
// pestañas de Día a día) NO es cambiar de pantalla: la cabecera y las pestañas se quedan quietas, no hay
// pantalla de carga, y solo el contenido de debajo reacciona (lo atenúa `SectionPanel`).
type PendingNavigation = { href: string; from: string; tabSwitch: boolean }
type NavigationState = { pendingHref: string | null; loaderVisible: boolean; tabSwitch: boolean }

const NavigationContext = createContext<NavigationState>({ pendingHref: null, loaderVisible: false, tabSwitch: false })

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
  // Cuando la ruta cambia, la navegación en curso (si la había) ya terminó: se borra aquí, en el
  // render, con el patrón de "guardar lo del render anterior" de React. Sin esto, el estado
  // quedaba guardado y, al volver con el botón "atrás" a la ruta de origen, se reactivaba solo:
  // la pantalla de carga se quedaba encima de la página y el menú marcaba la sección equivocada.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (lastPathname !== pathname) {
    setLastPathname(pathname)
    setPending(null)
    setLoaderShown(false)
  }
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

    const tabSwitch = anchor.closest('[data-tab-switch]') !== null
    setPending({ href: url.pathname, from: pathname, tabSwitch })
    setLoaderShown(false)
    clearTimeout(giveUp.current)
    giveUp.current = setTimeout(() => setPending(null), GIVE_UP_MS)
    clearTimeout(loaderTimer.current)
    if (!tabSwitch) loaderTimer.current = setTimeout(() => setLoaderShown(true), LOADER_DELAY_MS)
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
  const tabSwitch = pendingHref !== null && pending !== null && pending.tabSwitch
  const value = useMemo(
    () => ({ pendingHref, loaderVisible: pendingHref !== null && loaderShown, tabSwitch }),
    [pendingHref, loaderShown, tabSwitch],
  )

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

// Ruta a la que se está navegando, o null si no hay navegación en curso.
export function usePendingHref() {
  return useContext(NavigationContext).pendingHref
}

// true mientras llega la pestaña elegida (no un cambio de pantalla): lo usa SectionPanel para atenuar
// solo el contenido, sin tocar la cabecera ni las pestañas.
export function usePendingTabSwitch() {
  return useContext(NavigationContext).tabSwitch
}

// Envuelve el contenido de la página. Mientras se espera la siguiente, la actual se
// atenúa y baja un poco (la "salida" que Next.js no anima por sí solo); si tarda, se
// cambia por la pantalla de carga general. La página vieja se OCULTA, no se desmonta:
// así el router de Next sigue montado y la navegación no se entera.
export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  const { pendingHref, loaderVisible, tabSwitch } = useContext(NavigationContext)
  return (
    // Con la pantalla de carga visible ya no se atenúa el contenedor: la carga entra con su
    // propio fundido, y si además estuviera atenuada se verían dos fundidos multiplicados.
    // En un cambio de pestaña tampoco se atenúa: eso lo hace SectionPanel, solo sobre el contenido.
    <div className={className} data-pending={pendingHref && !loaderVisible && !tabSwitch ? '' : undefined}>
      {loaderVisible ? (
        <div className={styles.loaderIn}>
          <GeneralLoading />
        </div>
      ) : null}
      <div hidden={loaderVisible}>{children}</div>
    </div>
  )
}
