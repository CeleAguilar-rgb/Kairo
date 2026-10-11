import styles from './Checkbox.module.css'

type CheckboxProps = {
  checked: boolean
  onToggle: () => void
  label: string
  className?: string
}

export function Checkbox({ checked, onToggle, label, className }: CheckboxProps) {
  const classes = [styles.checkbox, checked ? styles.checked : null, className].filter(Boolean).join(' ')

  return (
    <button type="button" aria-pressed={checked} aria-label={label} onClick={onToggle} className={classes}>
      {checked ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      ) : null}
    </button>
  )
}
