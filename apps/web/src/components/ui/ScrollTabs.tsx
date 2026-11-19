'use client'

import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react'

import styles from './ScrollTabs.module.css'

// El ancho máximo del desvanecido de cada borde (px). Crece poco a poco desde 0 mientras se desliza.
const FADE = 28

// Un <nav> de pestañas que se desliza de lado cuando no caben, con los tres arreglos de la revisión móvil:
// (1) cada pestaña en una sola línea, (2) un desvanecido en el borde donde hay más pestañas escondidas, para
// que se note que se puede deslizar, y (3) la pestaña activa se lleva a la vista al cargar y al cambiar.
// El aspecto (la píldora, el color) sigue siendo de cada módulo: llega por `className` y se queda en el <nav>.
//
// El desvanecido NO va en el <nav> sino en un contenedor interior que es el que se desliza: así la máscara
// solo desvanece las pestañas y deja el fondo de la píldora intacto. Con la máscara en el <nav> se
// desvanecía también ese fondo y se veía el color de la página en vez del de la píldora.
export function ScrollTabs({ as = 'nav', className, children, ...rest }: ComponentPropsWithoutRef<'nav'> & { as?: 'nav' | 'div' }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const lastActive = useRef<Element | null>(null)
  const Tag = as

  // Cada borde se desvanece en proporción a lo que queda escondido de ese lado (hasta FADE px): al empezar
  // a deslizar crece desde 0 y al llegar al final se va igual de despacio, nada aparece de golpe. Se
  // escribe directo en las variables CSS (sin estado de React) porque cambia en cada pixel de scroll.
  function updateFades() {
    const scroller = scrollerRef.current
    if (!scroller) return
    const hiddenStart = scroller.scrollLeft
    const hiddenEnd = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft
    scroller.style.setProperty('--fade-start', `${Math.min(FADE, Math.max(0, hiddenStart))}px`)
    scroller.style.setProperty('--fade-end', `${Math.min(FADE, Math.max(0, hiddenEnd))}px`)
  }

  // Sin lista de dependencias a propósito: corre cada vez que la pestaña activa cambia de render, y solo
  // actúa cuando la activa es otra distinta (así no pelea con la persona mientras desliza a mano).
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    // La activa es un enlace con aria-current, o (en Segmented) un botón con aria-pressed / aria-checked.
    const active = scroller.querySelector('[aria-current="page"], [aria-pressed="true"], [aria-checked="true"]')
    if (active && active !== lastActive.current) {
      lastActive.current = active
      const tab = active as HTMLElement
      scroller.scrollTo({ left: tab.offsetLeft - (scroller.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' })
    }
    updateFades()
  })

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const observer = new ResizeObserver(updateFades)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag className={className} {...rest}>
      <div ref={scrollerRef} className={styles.scroller} onScroll={updateFades}>
        {children}
      </div>
    </Tag>
  )
}
