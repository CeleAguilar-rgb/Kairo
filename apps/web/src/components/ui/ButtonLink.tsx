import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

import styles from './Button.module.css'

type ButtonLinkVariant = 'solid' | 'secondary' | 'ghost' | 'plain'

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, 'className'> & {
  variant?: ButtonLinkVariant
  className?: string
  children: ReactNode
}

const VARIANT_CLASS: Record<ButtonLinkVariant, string> = {
  solid: styles.solid,
  secondary: styles.secondary,
  ghost: styles.ghost,
  plain: styles.plain,
}

// Un enlace con el aspecto de un Button (mismos estilos, sin duplicarlos): para lo que navega
// a otra pantalla ("Nuevo proyecto", "Editar proyecto"). Un <button> no puede ser un enlace
// real: no se abre en otra pestaña ni se puede copiar su dirección.
export function ButtonLink({ variant = 'solid', className, children, ...rest }: ButtonLinkProps) {
  const classes = [styles.button, VARIANT_CLASS[variant], className].filter(Boolean).join(' ')

  return (
    <Link className={classes} {...rest}>
      {children}
    </Link>
  )
}
