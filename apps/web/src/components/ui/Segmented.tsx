'use client'

import { LayoutGroup, motion } from 'motion/react'
import { useId, type ReactNode } from 'react'

import { SPRING } from '@/lib/motion'

import styles from './Segmented.module.css'

type Option<T extends string> = { value: T; label: ReactNode }

type SegmentedProps<T extends string> = {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  // 'radio' para formularios (Estado en Nueva tarea), 'toggle' para cambiar de vista (Lista/Tablero).
  mode?: 'radio' | 'toggle'
  // 'glass' sobre el fondo de la página, 'raised' dentro de un panel.
  tone?: 'glass' | 'raised'
}

// Grupo de opciones en una píldora (canvas: Lista/Tablero, Estado). La opción
// elegida tiene un fondo oscuro que se desliza de una a otra (layoutId). Cada
// instancia usa su propio id de layout para no robarse la píldora entre sí.
export function Segmented<T extends string>({ label, value, options, onChange, mode = 'toggle', tone = 'glass' }: SegmentedProps<T>) {
  const groupId = useId()

  return (
    <LayoutGroup id={groupId}>
      <div
        role={mode === 'radio' ? 'radiogroup' : 'group'}
        aria-label={label}
        className={[styles.group, tone === 'raised' ? styles.raised : styles.glass].join(' ')}
      >
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role={mode === 'radio' ? 'radio' : undefined}
              aria-checked={mode === 'radio' ? selected : undefined}
              aria-pressed={mode === 'toggle' ? selected : undefined}
              className={[styles.option, selected ? styles.selected : null].filter(Boolean).join(' ')}
              onClick={() => onChange(option.value)}
            >
              {selected ? <motion.span layoutId="segmented-pill" className={styles.pill} transition={SPRING.slide} /> : null}
              <span className={styles.label}>{option.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
