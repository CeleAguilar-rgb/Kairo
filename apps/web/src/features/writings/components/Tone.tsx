import type { ReactNode } from 'react'

import type { OptionTone } from '../types'

import colors from './WritingColors.module.css'
import styles from './Tone.module.css'

// Una etiqueta de color ("En curso", "Sudria", "Aurelun"): el color sale de su clave, no de un hex.
export function Chip({ tone, size = 'md', children }: { tone: OptionTone; size?: 'sm' | 'md'; children: ReactNode }) {
  return <span className={[styles.chip, size === 'sm' ? styles.sm : null, colors[`tone_${tone}`]].filter(Boolean).join(' ')}>{children}</span>
}

// El círculo de un personaje: su foto si tiene, o su inicial del color de su reino (o grupo). `square` es la foto
// grande del panel (esquinas redondeadas en vez de círculo, como en el canvas).
export function Avatar({ initial, tone, size = 40, imageUrl = null, square = false }: { initial: string; tone: OptionTone; size?: number; imageUrl?: string | null; square?: boolean }) {
  return (
    <span
      className={[styles.avatar, square ? styles.square : null, colors[`tone_${tone}`]].filter(Boolean).join(' ')}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmada de corta duración, no un asset que next/image deba optimizar
        <img src={imageUrl} alt="" className={styles.photo} />
      ) : (
        initial
      )}
    </span>
  )
}
