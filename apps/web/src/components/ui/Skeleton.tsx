import type { CSSProperties } from 'react'

import styles from './Skeleton.module.css'

type SkeletonProps = {
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  // 'inverted' para esqueletos dentro de la tarjeta destacada (fondo tinta).
  tone?: 'surface' | 'inverted'
  radius?: 'sm' | 'md' | 'lg' | 'pill'
}

// Bloque con brillo que se desliza (pantalla Estados del canvas). Se usa
// cuando una carga pasa de 1 s, con la forma real de lo que va a aparecer.
export function Skeleton({ width = '100%', height = 12, tone = 'surface', radius = 'sm' }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={[styles.skeleton, tone === 'inverted' ? styles.inverted : null, styles[radius]].filter(Boolean).join(' ')}
      style={{ width, height }}
    />
  )
}
