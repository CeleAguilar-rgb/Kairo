'use client'

import { useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from 'react'

import styles from './ScrollTabs.module.css'
import { useScrollFades } from './useScrollFades'

// Un <nav> de pestañas que se desliza de lado cuando no caben, con los tres arreglos de la revisión móvil:
// (1) cada pestaña en una sola línea, (2) un desvanecido en el borde donde hay más pestañas escondidas, para
// que se note que se puede deslizar, y (3) la pestaña activa se lleva a la vista al cargar y al cambiar.
// El aspecto (la píldora, el color) sigue siendo de cada módulo: llega por `className` y se queda en el <nav>.
//
// El desvanecido NO va en el <nav> sino en un contenedor interior que es el que se desliza: así la máscara
// solo desvanece las pestañas y deja el fondo de la píldora intacto. Con la máscara en el <nav> se
// desvanecía también ese fondo y se veía el color de la página en vez del de la píldora.
//
// `centerEdges` (tiras de días en el teléfono): deja un hueco en cada orilla para que también el primero o el
// último puedan quedar al centro, p. ej. hoy cuando es lunes. Cada tira dice en `--center-item` cuánto mide
// uno de sus días (por defecto 56px).
export function ScrollTabs({
  as = 'nav',
  centerEdges = false,
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<'nav'> & { as?: 'nav' | 'div'; centerEdges?: boolean }) {
  const { ref: scrollerRef, update: updateFades } = useScrollFades<HTMLDivElement>()
  const lastActive = useRef<Element | null>(null)
  // true desde que la persona desliza con el dedo o la rueda, hasta que la pestaña activa cambie.
  const userMoved = useRef(false)
  const Tag = as

  // Lleva la pestaña activa al centro. La posición se mide con getBoundingClientRect y no con offsetLeft:
  // offsetLeft cuenta desde el ancestro posicionado más cercano (no desde este contenedor) y, dentro de un
  // panel o una página con márgenes, se pasaba de largo.
  const centerActive = useCallback(
    (behavior: ScrollBehavior) => {
      const scroller = scrollerRef.current
      // La activa es un enlace con aria-current (o un día con aria-current="date"), o (en Segmented) un botón con
      // aria-pressed / aria-checked.
      const active = scroller?.querySelector<HTMLElement>('[aria-current="page"], [aria-current="date"], [aria-pressed="true"], [aria-checked="true"]')
      if (!scroller || !active) return
      const left = active.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft
      scroller.scrollTo({ left: left - (scroller.clientWidth - active.offsetWidth) / 2, behavior })
    },
    [scrollerRef],
  )

  // Sin lista de dependencias a propósito: corre cada vez que la pestaña activa cambia de render, y solo
  // actúa cuando la activa es otra distinta (así no pelea con la persona mientras desliza a mano).
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const active = scroller.querySelector('[aria-current="page"], [aria-current="date"], [aria-pressed="true"], [aria-checked="true"]')
    if (active && active !== lastActive.current) {
      lastActive.current = active
      userMoved.current = false
      centerActive('smooth')
    }
    updateFades()
  })

  // Si lo de dentro cambia de ancho (la tipografía termina de cargar), la activa se vuelve a centrar, salvo
  // que la persona ya esté deslizando a mano.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const observer = new ResizeObserver(() => {
      if (!userMoved.current) centerActive('auto')
    })
    for (const child of Array.from(scroller.children)) observer.observe(child)
    return () => observer.disconnect()
  }, [scrollerRef, centerActive])

  return (
    <Tag className={className} {...rest}>
      <div
        ref={scrollerRef}
        className={[styles.scroller, centerEdges ? styles.centerEdges : null].filter(Boolean).join(' ')}
        onScroll={updateFades}
        onPointerDown={() => (userMoved.current = true)}
        onWheel={() => (userMoved.current = true)}
      >
        {children}
      </div>
    </Tag>
  )
}
