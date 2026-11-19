import type { ComponentPropsWithoutRef } from 'react'

import styles from './ChipRow.module.css'
import { ScrollFade } from './ScrollFade'

// Una fila de chips (filtros, etiquetas, prioridades, días…) en una sola línea que se desliza de lado con el
// desvanecido de ScrollFade, en vez de partirse en varios renglones. Es el mismo comportamiento que las
// píldoras de Segmented y las pestañas. Los chips los pinta cada pantalla: aquí solo se ocupa el contenedor,
// que conserva su display: flex y su gap (llegan por className) y recibe role y aria-* igual que un <div>.
export function ChipRow({ className, ...rest }: ComponentPropsWithoutRef<'div'>) {
  return <ScrollFade className={[styles.row, className].filter(Boolean).join(' ')} {...rest} />
}
