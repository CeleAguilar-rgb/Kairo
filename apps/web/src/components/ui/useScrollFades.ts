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

  // Se recalcula si cambia el tamaño del contenedor (girar el teléfono, abrir un panel…).
  useEffect(() => {
    const scroller = ref.current
    if (!scroller) return
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [update])

  return { ref, update }
}
