'use client'

import { useEffect, type ComponentPropsWithoutRef } from 'react'

import styles from './ScrollFade.module.css'
import { useScrollFades } from './useScrollFades'

// Un contenedor que se desliza de lado (una tabla o cuadrícula más ancha que la pantalla) con el mismo
// desvanecido progresivo que ScrollTabs en los bordes donde hay más contenido escondido.
export function ScrollFade({ className, children, ...rest }: ComponentPropsWithoutRef<'div'>) {
  const { ref, update } = useScrollFades<HTMLDivElement>()

  // El contenido puede cambiar de ancho entre renders (más horas, otra vista): se vuelve a medir.
  useEffect(() => {
    update()
  })

  return (
    <div ref={ref} className={[styles.fade, className].filter(Boolean).join(' ')} onScroll={update} {...rest}>
      {children}
    </div>
  )
}
