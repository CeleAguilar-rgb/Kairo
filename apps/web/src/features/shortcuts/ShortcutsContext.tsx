'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { NotificationsPanel } from './components/NotificationsPanel'
import { QuickCapture } from './components/QuickCapture'
import { SearchPalette } from './components/SearchPalette'
import { listNotificationsAction } from './notification-actions'
import type { NotificationsPanelData } from './types'

// Cuál de los tres atajos está abierto (Atajos.dc.html): abrir uno cierra los otros.
export type ShortcutPanel = 'search' | 'notifications' | 'capture'

type ShortcutsValue = {
  open: ShortcutPanel | null
  toggle: (panel: ShortcutPanel) => void
  close: () => void
  // Cuántos avisos faltan por leer (el punto de la campana).
  unread: number
}

const ShortcutsContext = createContext<ShortcutsValue | null>(null)

export function useShortcuts() {
  const value = useContext(ShortcutsContext)
  if (!value) throw new Error('useShortcuts necesita <ShortcutsProvider> (vive en el layout del dashboard).')
  return value
}

type ShortcutsProviderProps = {
  children: ReactNode
  timeZone: string
  // En modo demo no se guarda nada: la captura rápida lo avisa en vez de llamar a la API.
  demo: boolean
}

// Los atajos que viven en todas las pantallas: la búsqueda (lupa o Ctrl+K) y el "+" de captura rápida. Montado una
// sola vez en el layout del dashboard, igual que el reproductor de Enfoque. El panel de avisos se abre desde la
// campana del Topnav con este mismo `toggle`.
export function ShortcutsProvider({ children, timeZone, demo }: ShortcutsProviderProps) {
  const [open, setOpen] = useState<ShortcutPanel | null>(null)
  const [notifications, setNotifications] = useState<NotificationsPanelData | null>(null)

  // Los avisos se piden al entrar, al abrir la campana y al volver a la pestaña: los crean las tareas programadas,
  // no esta pantalla, así que no hay otro momento en que se sepa que llegó uno. Si falla, se queda lo que había.
  const refreshNotifications = useCallback(async () => {
    const result = await listNotificationsAction()
    if (result.ok) setNotifications(result.data)
  }, [])

  useEffect(() => {
    // Al entrar: la carga llega después del primer render, el setState no es de este efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshNotifications()
    function onVisible() {
      if (document.visibilityState === 'visible') void refreshNotifications()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshNotifications])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open === 'notifications') void refreshNotifications()
  }, [open, refreshNotifications])

  // Ctrl+K (Cmd+K en Mac) abre y cierra la búsqueda desde cualquier pantalla, también escribiendo en un campo.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => (current === 'search' ? null : 'search'))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Estable: el panel lo usa en un efecto (clic afuera).
  const closePanel = useCallback(() => setOpen(null), [])

  const value = useMemo<ShortcutsValue>(
    () => ({
      open,
      toggle: (panel) => setOpen((current) => (current === panel ? null : panel)),
      close: () => setOpen(null),
      unread: notifications?.unread ?? 0,
    }),
    [open, notifications],
  )

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <SearchPalette open={open === 'search'} onClose={() => setOpen(null)} demo={demo} />
      <NotificationsPanel open={open === 'notifications'} onClose={closePanel} data={notifications} onChange={setNotifications} timeZone={timeZone} />
      <QuickCapture open={open === 'capture'} onToggle={() => value.toggle('capture')} onClose={() => setOpen(null)} timeZone={timeZone} demo={demo} />
    </ShortcutsContext.Provider>
  )
}
