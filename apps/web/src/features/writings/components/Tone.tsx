import type { ReactNode } from 'react'

import type { OptionTone } from '../types'

import colors from './WritingColors.module.css'
import styles from './Tone.module.css'

// Una etiqueta de color ("En curso", "Sudria", "Auralun"): el color sale de su clave, no de un hex.
export function Chip({ tone, size = 'md', children }: { tone: OptionTone; size?: 'sm' | 'md'; children: ReactNode }) {
  return <span className={[styles.chip, size === 'sm' ? styles.sm : null, colors[`tone_${tone}`]].filter(Boolean).join(' ')}>{children}</span>
}

// El círculo con la inicial de un personaje. Su color es el de su reino (o grupo).
export function Avatar({ initial, tone, size = 40 }: { initial: string; tone: OptionTone; size?: number }) {
  return (
    <span className={[styles.avatar, colors[`tone_${tone}`]].join(' ')} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden="true">
      {initial}
    </span>
  )
}
