'use client'

import { useCallback, useEffect, useRef } from 'react'

// El ancho máximo del desvanecido de cada borde (px). Crece poco a poco desde 0 mientras se desliza.
const FADE = 28

// Lleva la cuenta de cuánto contenido queda escondido a cada lado de un contenedor que se desliza de lado y
// lo escribe en las variables CSS --fade-start / --fade-end (hasta FADE px). Así el desvanecido de la máscara
// crece en proporción al scroll: al empezar a deslizar sube desde 0 y al llegar al final se va igual de
// despacio, nada aparece de golpe. Va directo a las variables (sin estado de React) porque cambia en cada
// pixel de scroll. Lo usan ScrollTabs (pestañas) y ScrollFade (tablas anchas).
export function useScrollFades<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  const update = useCallback(() => {
    const scroller = ref.current
    if (!scroller) return
    const hiddenStart = scroller.scrollLeft
    const hiddenEnd = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft
    scroller.style.setProperty('--fade-start', `${Math.min(FADE, Math.max(0, hiddenStart))}px`)
    scroller.style.setProperty('--fade-end', `${Math.min(FADE, Math.max(0, hiddenEnd))}px`)
  }, [])

  // Se recalcula si cambia el tamaño del contenedor (girar el teléfono, abrir un panel…) o el de lo que lleva
  // dentro: cuando la tipografía termina de cargar las pestañas se ensanchan sin que el contenedor cambie, y
  // sin mirar a los hijos el desvanecido se quedaba con las medidas de antes (cortaba la pestaña elegida).
  useEffect(() => {
    const scroller = ref.current
    if (!scroller) return
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    for (const child of Array.from(scroller.children)) observer.observe(child)
    return () => observer.disconnect()
  }, [update])

  return { ref, update }
}
