'use client'

import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react'

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
export function ScrollTabs({ as = 'nav', className, children, ...rest }: ComponentPropsWithoutRef<'nav'> & { as?: 'nav' | 'div' }) {
  const { ref: scrollerRef, update: updateFades } = useScrollFades<HTMLDivElement>()
  const lastActive = useRef<Element | null>(null)
  const Tag = as

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

  return (
    <Tag className={className} {...rest}>
      <div ref={scrollerRef} className={styles.scroller} onScroll={updateFades}>
        {children}
      </div>
    </Tag>
  )
}
