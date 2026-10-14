import styles from './Toggle.module.css'

type ToggleProps = {
  checked: boolean
  onToggle: () => void
  label: string
  className?: string
}

export function Toggle({ checked, onToggle, label, className }: ToggleProps) {
  const classes = [styles.toggle, checked ? styles.checked : null, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={classes}
    >
      <span className={styles.knob} />
    </button>
  )
}
