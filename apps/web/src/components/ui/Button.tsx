import type { ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './Button.module.css'

type ButtonVariant = 'solid' | 'secondary' | 'ghost' | 'danger' | 'plain'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  iconOnly?: boolean
  children: ReactNode
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  solid: styles.solid,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
  plain: styles.plain,
}

export function Button({
  variant = 'solid',
  iconOnly = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [styles.button, VARIANT_CLASS[variant], iconOnly ? styles.iconOnly : null, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}
