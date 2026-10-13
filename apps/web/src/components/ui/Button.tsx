'use client'

import { motion } from 'motion/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './Button.module.css'

type ButtonVariant = 'solid' | 'secondary' | 'ghost' | 'danger' | 'plain'

// Omit: motion.button tipa estos eventos distinto al <button> nativo (conflicto
// conocido de framer-motion con los tipos de React).
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>

type ButtonProps = NativeButtonProps & {
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
    <motion.button type={type} className={classes} whileTap={{ scale: 0.97 }} {...rest}>
      {children}
    </motion.button>
  )
}
