import type { ReactNode } from 'react'

import { Doodle, type DoodleKind } from './Doodle'
import styles from './EmptyState.module.css'

type EmptyStateProps = {
  id: string
  eyebrow?: string
  title: string
  description: string
  doodle?: DoodleKind
  tone?: 'surface' | 'inverted' | 'accent'
  // Cada vacío dice qué hacer y trae su botón (docs/guides/design.md, Vacíos).
  actions?: ReactNode
}

// Pantalla Vacios del canvas: doodle que flota despacio, título, qué hacer y botón.
export function EmptyState({ id, eyebrow, title, description, doodle = 'star', tone = 'surface', actions }: EmptyStateProps) {
  return (
    <section className={[styles.empty, styles[tone]].join(' ')} aria-labelledby={id}>
      {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
      <span className={styles.doodle}>
        <Doodle kind={doodle} size={72} strokeWidth={1.8} />
      </span>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      <p className={styles.description}>{description}</p>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  )
}
