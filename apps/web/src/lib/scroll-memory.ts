// Recordar dónde se quedó el scroll de cada pantalla: al irte a otra sección con la barra y volver, la pantalla
// abre donde la dejaste y no hasta arriba (Next.js siempre sube al inicio al navegar por un enlace).
//
// Dos decisiones de diseño:
//  - La posición se guarda en el CLIC del enlace (lo llama NavigationProvider), no mientras se desplaza. Al
//    salir, la pantalla de carga encoge la página y el navegador "recorta" el scroll a 0: si se guardara siempre,
//    se guardaría ese 0.
//  - Solo se restaura si se llegó por un enlace. Con "atrás" y "adelante" Next ya restaura por su cuenta.
//
// Vive en memoria del navegador (se pierde al recargar): es una comodidad, no un dato que haya que conservar.

const positions = new Map<string, number>()

// true entre el clic en un enlace y la llegada de la pantalla nueva.
let arrivingByLink = false

// Cuánto se espera a que la pantalla nueva tenga altura suficiente (carga sus datos, llega por partes).
const WAIT_MS = 1500

// Se llama al hacer clic en un enlace que cambia de pantalla, con la ruta de la que se sale.
export function rememberScroll(fromPathname: string) {
  positions.set(fromPathname, Math.round(window.scrollY))
  arrivingByLink = true
}

// Una navegación que no llegó (fallo de red, la persona cancela): no restaurar en la siguiente.
export function forgetPendingRestore() {
  arrivingByLink = false
}

// Un clic que cambia de pestaña dentro de una pantalla (no es cambiar de sección): esa sí arranca arriba.
export function skipRestore() {
  arrivingByLink = false
}

// Se llama cuando cambia la ruta. Si se llegó por un enlace y esa pantalla tenía scroll guardado, vuelve ahí.
// La pantalla nueva puede tardar en tener su altura completa, así que se reintenta cada cuadro hasta que quepa;
// si la persona empieza a desplazarse ella misma, se deja de insistir.
export function restoreScroll(pathname: string) {
  if (!arrivingByLink) return
  arrivingByLink = false

  const target = positions.get(pathname)
  if (!target) return

  const started = performance.now()
  let frame = 0

  const stop = () => {
    cancelAnimationFrame(frame)
    for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, stop)
  }
  for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { passive: true, once: true })

  const tick = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const timedOut = performance.now() - started > WAIT_MS
    if (maxScroll >= target || timedOut) {
      // 'instant' le gana a un posible scroll-behavior: smooth del CSS: aquí no debe verse el viaje.
      window.scrollTo({ top: Math.min(target, Math.max(0, maxScroll)), behavior: 'instant' })
      stop()
      return
    }
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

// Gestos con los que la persona toma el control del scroll.
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown'] as const
