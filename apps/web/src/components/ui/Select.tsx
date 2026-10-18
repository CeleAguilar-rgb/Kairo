import type { SelectHTMLAttributes } from 'react'

import styles from './Select.module.css'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string
  label: string
  options: { value: string; label: string }[]
}

// <select> nativo con el estilo de los campos del canvas. Nativo a propósito:
// teclado, lector de pantalla y teléfono funcionan sin código extra.
export function Select({ id, label, options, className, ...rest }: SelectProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.wrap}>
        <select id={id} className={[styles.select, className].filter(Boolean).join(' ')} {...rest}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  )
}
