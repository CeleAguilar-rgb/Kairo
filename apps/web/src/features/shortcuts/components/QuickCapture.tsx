'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from 'react'

import { useCurrentPageAction } from '@/components/layout/PageAction'
import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { PanelScrim } from '@/components/ui/PanelScrim'
import { useToast } from '@/components/ui/Toast'
import { createEventAction } from '@/features/agenda'
import { useFocus } from '@/features/focus'
import { quickExpenseAction } from '@/features/finance'
import { createReminderAction } from '@/features/reminders'
import { createNoteAction } from '@/features/writings'
import { EASE_OUT, SPRING } from '@/lib/motion'
import { useNarrowScreen } from '@/lib/use-narrow-screen'
import { ChipRow } from '@/components/ui/ChipRow'

import { dayFor, parseExpense, reminderSlot, WHENS, whenLabel } from '../capture'
import { createQuickTask } from '../create-task'
import type { CaptureKind, CaptureWhen } from '../types'

import styles from './QuickCapture.module.css'

// Cuánto hay que mantener presionado el "+" para abrir el pomodoro, y cuánto puede moverse el dedo antes de
// que cuente como un arrastre (scroll) y no como una pulsación larga.
const LONG_PRESS_MS = 450
const LONG_PRESS_MOVE = 10

// El anillo de avance va dentro del círculo del "+" (el botón mide 60). El "+" llega a unos 8px del
// centro y el borde del botón está a 30. A mitad de camino (radio 19) se veía más pegado al "+" que al borde,
// así que se acercó un poco al borde (radio 21: unos 7px de la orilla y unos 10px del "+").
const FAB_RING = 2 * Math.PI * 21

type QuickCaptureProps = {
  open: boolean
  onToggle: () => void
  onClose: () => void
  timeZone: string
  demo: boolean
}

// Los cinco tipos de Atajos.dc.html (CT): nombre, ícono, a dónde lleva "Más opciones" y qué pregunta el campo.
const KINDS: { kind: CaptureKind; name: string; icon: string; more: string; label: string }[] = [
  { kind: 'task', name: 'Tarea', icon: 'M4 4h16v16H4zM8.5 12l2.5 2.5 4.5-5', more: '/tareas', label: '¿Qué hay que hacer?' },
  { kind: 'event', name: 'Evento', icon: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4', more: '/agenda', label: '¿Qué pasa y dónde?' },
  { kind: 'expense', name: 'Gasto', icon: 'M4 7h16v10H4zM4 11h16', more: '/finanzas/movimientos?nuevo=1', label: '¿En qué y cuánto? Ej. Tacos 250' },
  { kind: 'reminder', name: 'Recordatorio', icon: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9', more: '/recordatorios', label: '¿Qué te recuerdo?' },
  { kind: 'note', name: 'Nota', icon: 'M6 3h9l4 4v14H6zM14 3v5h5', more: '/escritos/notas', label: 'Escribe tu idea' },
]

// El "+" (Atajos.dc.html): crea una tarea, un evento, un gasto, un recordatorio o una nota sin salir de la pantalla,
// en dos toques. Cada cosa se guarda con la acción pública de su módulo (docs/guides/modules.md); lo que no cabe
// aquí se termina en "Más opciones".
export function QuickCapture({ open, onToggle, onClose, timeZone, demo }: QuickCaptureProps) {
  const router = useRouter()
  const toast = useToast()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<CaptureKind>('task')
  const [text, setText] = useState('')
  const [when, setWhen] = useState<CaptureWhen>('today')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const focus = useFocus()
  // En el teléfono, si la pantalla tiene su propia acción de crear ("Nuevo evento", "Movimiento"…), el "+" hace
  // eso en vez de abrir la captura rápida. En escritorio la pantalla tiene su botón con texto y el "+" no cambia.
  const narrow = useNarrowScreen()
  const pageAction = useCurrentPageAction()
  const screenAction = narrow ? pageAction : null
  const pressTimer = useRef<number | null>(null)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const longPressed = useRef(false)
  // El botón se encoge un poco mientras se pulsa (whileTap); el anillo, que es un elemento aparte, lo imita.
  const [pressed, setPressed] = useState(false)
  const current = KINDS.find((item) => item.kind === kind)!
  const whens = WHENS[kind]
  const chosenWhen = whens.includes(when) ? when : (whens[0] ?? 'none')

  function cancelPress() {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current)
    pressTimer.current = null
    pressStart.current = null
  }

  // Si el componente se desmonta con la pulsación a medias, no debe quedar el temporizador vivo.
  useEffect(() => cancelPress, [])

  function endPress() {
    cancelPress()
    setPressed(false)
  }

  function handlePressStart(event: ReactPointerEvent) {
    longPressed.current = false
    setPressed(true)
    screenAction?.preload?.()
    pressStart.current = { x: event.clientX, y: event.clientY }
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null
      longPressed.current = true
      // Un toque corto de vibración confirma que se detectó (donde el aparato lo permite).
      navigator.vibrate?.(15)
      onClose()
      focus.setExpanded(true)
    }, LONG_PRESS_MS)
  }

  function handlePressMove(event: ReactPointerEvent) {
    const start = pressStart.current
    if (!start) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > LONG_PRESS_MOVE) cancelPress()
  }

  // Tras una pulsación larga el navegador igual dispara el clic al soltar: se ignora para no abrir también
  // la captura rápida. Con el pomodoro abierto el "+" es una "x" que lo cierra (así no se abre un panel
  // encima del otro); si la pantalla tiene su acción de crear, la hace; si no, abre o cierra la captura.
  function handleClick() {
    if (longPressed.current) {
      longPressed.current = false
      return
    }
    if (focus.expanded) {
      focus.setExpanded(false)
      return
    }
    if (screenAction && !open) {
      screenAction.run()
      return
    }
    onToggle()
  }

  function pickKind(next: CaptureKind) {
    setKind(next)
    setError(null)
    inputRef.current?.focus()
  }

  function save() {
    const value = text.trim()
    if (!value) {
      inputRef.current?.focus()
      return
    }
    if (demo) {
      toast.show({ message: 'En el modo demo no se guarda nada: es solo para mirar.', icon: 'info' })
      return
    }
    // "Otra fecha" de un gasto se elige en el formulario completo.
    if (kind === 'expense' && chosenWhen === 'none') {
      onClose()
      router.push(current.more)
      return
    }
    startSaving(async () => {
      const failure = await saveCapture(kind, value, chosenWhen, timeZone)
      if (failure) {
        setError(failure)
        return
      }
      setText('')
      setError(null)
      onClose()
      router.refresh()
      toast.show({ message: `${current.name} guardad${kind === 'note' || kind === 'task' ? 'a' : 'o'}: ${value}`, icon: 'check' })
    })
  }

  return (
    <>
      <PanelScrim open={open} onClose={onClose} />
      <AnimatePresence>
        {open ? (
          <motion.section
            className={styles.panel}
            role="dialog"
            aria-label="Crear rápido"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            onAnimationComplete={() => inputRef.current?.focus()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
            }}
          >
            <div role="radiogroup" aria-label="¿Qué quieres crear?" className={styles.kinds}>
              {KINDS.map((item) => {
                const on = item.kind === kind
                return (
                  <button key={item.kind} type="button" role="radio" aria-checked={on} className={on ? styles.kindOn : styles.kind} onClick={() => pickKind(item.kind)}>
                    <LineIcon d={[item.icon]} size={20} />
                    {item.name}
                  </button>
                )
              })}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={inputId}>
                {current.label}
              </label>
              <input
                ref={inputRef}
                id={inputId}
                className={error ? styles.inputBad : styles.input}
                type="text"
                value={text}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                onChange={(event) => {
                  setText(event.target.value)
                  setError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    save()
                  }
                }}
              />
              {error ? (
                <span id={`${inputId}-error`} className={styles.error}>
                  {error}
                </span>
              ) : null}
            </div>

            {whens.length > 0 ? (
              <ChipRow className={styles.whens} role="group" aria-label="¿Cuándo?">
                {whens.map((option) => (
                  <button key={option} type="button" aria-pressed={option === chosenWhen} className={option === chosenWhen ? styles.whenOn : styles.when} onClick={() => setWhen(option)}>
                    {whenLabel(kind, option)}
                  </button>
                ))}
              </ChipRow>
            ) : null}

            <div className={styles.footer}>
              <Link href={current.more} className={styles.more} onClick={onClose}>
                Más opciones
              </Link>
              <Button onClick={save} disabled={saving}>
                Guardar
              </Button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {/* El avance del pomodoro se dibuja sobre el botón (solo en teléfono y solo mientras corre; va dentro del círculo). Va aparte del botón
          porque este gira al abrirse y el anillo no debe girar con él. */}
      {focus.progress.running ? (
        <motion.svg
          className={styles.fabRing}
          width="60"
          height="60"
          viewBox="0 0 60 60"
          aria-hidden="true"
          animate={{ scale: pressed ? 0.92 : 1 }}
          transition={SPRING.pop}
        >
          <circle cx="30" cy="30" r="21" fill="none" className={styles.fabRingTrack} strokeWidth="3.5" />
          <circle
            cx="30"
            cy="30"
            r="21"
            fill="none"
            className={styles.fabRingWork}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={FAB_RING}
            strokeDashoffset={FAB_RING * (1 - focus.progress.fraction)}
            transform="rotate(-90 30 30)"
          />
        </motion.svg>
      ) : null}

      <span id="fab-hint" className={styles.srOnly}>
        Mantén presionado para abrir el pomodoro.
      </span>
      <motion.button
        type="button"
        className={styles.fab}
        aria-label={open ? 'Cerrar crear rápido' : focus.expanded ? 'Cerrar el pomodoro' : (screenAction?.label ?? 'Crear rápido')}
        aria-describedby="fab-hint"
        aria-expanded={open || focus.expanded}
        onClick={handleClick}
        onPointerDown={handlePressStart}
        onPointerMove={handlePressMove}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(event) => event.preventDefault()}
        animate={{ rotate: open || focus.expanded ? 45 : 0 }}
        whileTap={{ scale: 0.92 }}
        transition={SPRING.pop}
      >
        <LineIcon d={['M12 5v14M5 12h14']} size={24} strokeWidth={2.2} />
      </motion.button>
    </>
  )
}

// Guarda lo capturado con la acción del módulo que corresponde. Devuelve el error para mostrarlo bajo el campo.
async function saveCapture(kind: CaptureKind, text: string, when: CaptureWhen, timeZone: string): Promise<string | null> {
  if (kind === 'task') return createQuickTask(text, dayFor(when, timeZone))

  if (kind === 'event') {
    // Un evento de todo el día: la hora se pone después en Agenda si hace falta.
    const result = await createEventAction({
      title: text,
      kind: 'personal',
      date: dayFor(when, timeZone),
      allDay: true,
      startTime: null,
      endTime: null,
      location: null,
      projectId: null,
      repeat: 'none',
      reminder: 'none',
      notes: '',
    })
    return result.ok ? null : (result.message ?? Object.values(result.errors)[0] ?? 'No se pudo guardar el evento.')
  }

  if (kind === 'expense') {
    const expense = parseExpense(text)
    if (!expense) return 'Escribe en qué y cuánto, por ejemplo: Tacos 250.'
    const result = await quickExpenseAction({ ...expense, occurredOn: dayFor(when, timeZone) })
    return result.ok ? null : (result.message ?? Object.values(result.errors)[0] ?? 'No se pudo guardar el gasto.')
  }

  if (kind === 'reminder') {
    const result = await createReminderAction({ title: text, ...reminderSlot(when, timeZone), repeat: 'none' })
    return result.ok ? null : (result.message ?? Object.values(result.errors)[0] ?? 'No se pudo guardar el recordatorio.')
  }

  const result = await createNoteAction(text)
  return result.ok ? null : (result.message ?? 'No se pudo guardar la nota.')
}
