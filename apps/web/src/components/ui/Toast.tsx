'use client'

import { animate, AnimatePresence, motion, useMotionValue, type AnimationPlaybackControls } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react'

import { DURATION, EASE_OUT, SPRING } from '@/lib/motion'

import styles from './Toast.module.css'

type ToastIcon = 'trash' | 'check' | 'info'

type ToastInput = {
  message: string
  icon?: ToastIcon
  // Si viene, el aviso muestra "Deshacer" (patrón de borrar: docs/guides/design.md).
  onUndo?: () => void
}

type ToastItem = ToastInput & { id: number }

type ToastApi = { show: (toast: ToastInput) => void }

const ToastContext = createContext<ToastApi | null>(null)

// Cuánto vive un aviso. Con "Deshacer" un poco más: hay que alcanzar a leerlo y decidir.
const LIFETIME_MS = 4000
const LIFETIME_UNDO_MS = 6000
// Más de tres apilados ya no se leen; el más viejo se va.
const MAX_VISIBLE = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback((toast: ToastInput) => {
    const id = nextId.current++
    setToasts((current) => [...current, { ...toast, id }].slice(-MAX_VISIBLE))
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast() necesita estar dentro de <ToastProvider>.')
  return context
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false)
  const lifetime = toast.onUndo ? LIFETIME_UNDO_MS : LIFETIME_MS
  // El reloj es un motion value animado a mano (no una prop animate): así
  // reducedMotion no lo vuelve instantáneo — con movimiento reducido la barra
  // no importa, pero el aviso tiene que seguir durando lo mismo.
  const remaining = useMotionValue(1)
  const controls = useRef<AnimationPlaybackControls | null>(null)
  const handleExpire = useEffectEvent(onDismiss)

  useEffect(() => {
    controls.current = animate(remaining, 0, {
      duration: lifetime / 1000,
      ease: 'linear',
      onComplete: () => handleExpire(),
    })
    return () => controls.current?.stop()
  }, [remaining, lifetime])

  useEffect(() => {
    if (paused) controls.current?.pause()
    else controls.current?.play()
  }, [paused])

  return (
    <motion.div
      layout
      className={styles.toast}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: SPRING.panel }}
      exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: DURATION.base, ease: EASE_OUT } }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <ToastGlyph icon={toast.icon ?? 'info'} />
      <span className={styles.message}>{toast.message}</span>
      {toast.onUndo ? (
        <button
          type="button"
          className={styles.undo}
          onClick={() => {
            toast.onUndo?.()
            onDismiss()
          }}
        >
          Deshacer
        </button>
      ) : null}
      {/* La barrita es el reloj del aviso: cuando termina de vaciarse, el aviso se va.
          Al pasar el mouse (o con el foco dentro) se pausa, para alcanzar a picar "Deshacer". */}
      <motion.span className={styles.timer} aria-hidden="true" style={{ scaleX: remaining }} />
    </motion.div>
  )
}

const GLYPHS: Record<ToastIcon, string> = {
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  check: 'M5 12l5 5L20 7',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
}

function ToastGlyph({ icon }: { icon: ToastIcon }) {
  return (
    <svg
      className={styles.icon}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={GLYPHS[icon]} />
    </svg>
  )
}
