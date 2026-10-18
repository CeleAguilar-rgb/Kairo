import { useEffect, useEffectEvent, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Lo que todo panel o modal necesita mientras está abierto: Escape cierra, Tab
// da la vuelta dentro (no se escapa a la página de atrás), la página de atrás
// no hace scroll, y al cerrar el foco regresa a lo que lo abrió.
export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  // useEffectEvent: el efecto depende solo de `open`. Si dependiera de onClose
  // (que suele ser una función nueva en cada render), se limpiaría y volvería a
  // correr al escribir dentro del panel, y la limpieza le robaría el foco.
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
      if (event.key === 'Tab') trapFocus(event, ref.current)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [open, ref])
}

// Se llama cuando termina la animación de entrada: enfocar antes hace que el
// navegador haga scroll hacia un elemento que todavía está fuera de la pantalla.
export function focusFirst(container: HTMLElement | null) {
  if (!container || container.contains(document.activeElement)) return
  container.querySelector<HTMLElement>(FOCUSABLE)?.focus()
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
