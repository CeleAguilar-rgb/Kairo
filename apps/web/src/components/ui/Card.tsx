import type { HTMLAttributes, ReactNode } from 'react'

import styles from './Card.module.css'

type CardTone = 'surface' | 'inverted'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone
  children: ReactNode
}

export function Card({ tone = 'surface', className, children, ...rest }: CardProps) {
  const classes = [styles.card, tone === 'inverted' ? styles.inverted : styles.surface, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
