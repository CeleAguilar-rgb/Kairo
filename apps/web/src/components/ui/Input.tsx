import type { InputHTMLAttributes, ReactNode } from 'react'

import styles from './Input.module.css'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  labelExtra?: ReactNode
  hint?: string
  error?: string
  trailing?: ReactNode
}

export function Input({ id, label, labelExtra, hint, error, trailing, className, ...rest }: InputProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={styles.field}>
      {labelExtra ? (
        <div className={styles.labelRow}>
          <label htmlFor={id} className={styles.label}>
            {label}
          </label>
          {labelExtra}
        </div>
      ) : (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrap}>
        <input
          id={id}
          className={[styles.input, trailing ? styles.hasTrailing : null, error ? styles.invalid : null, className]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...rest}
        />
        {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
      </div>
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
