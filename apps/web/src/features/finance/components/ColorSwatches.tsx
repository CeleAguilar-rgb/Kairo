'use client'

import colors from './FinanceColors.module.css'
import styles from './ColorSwatches.module.css'

type ColorSwatchesProps<T extends string> = {
  // El nombre del grupo para lectores de pantalla ("Color").
  label: string
  value: T
  options: { value: T; label: string }[]
  // Qué paleta usa: la de las categorías o la de las tarjetas (FinanceColors.module.css).
  palette: 'cat' | 'card'
  onChange: (value: T) => void
}

// Las muestras de color de una categoría o una tarjeta (FinPresupuesto, FinMembresia): cuadritos redondeados, y
// el elegido lleva un anillo. Cada uno es un botón con el nombre del color, para que no dependa de verlo.
export function ColorSwatches<T extends string>({ label, value, options, palette, onChange }: ColorSwatchesProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.group}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          aria-label={option.label}
          title={option.label}
          className={[styles.swatch, colors[`${palette}_${option.value}`], value === option.value ? styles.on : null].filter(Boolean).join(' ')}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  )
}
