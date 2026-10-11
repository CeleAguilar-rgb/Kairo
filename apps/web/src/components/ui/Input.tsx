import type { InputHTMLAttributes } from 'react'

import styles from './Input.module.css'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  hint?: string
  error?: string
}

export function Input({ id, label, hint, error, className, ...rest }: InputProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={[styles.input, error ? styles.invalid : null, className].filter(Boolean).join(' ')}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}
