import Link from 'next/link'
import type { HTMLAttributes, ReactNode } from 'react'

import styles from './Card.module.css'

// 'inverted': la tarjeta destacada (una por pantalla). 'accent': fondo lavanda suave (Recordatorios).
type CardTone = 'surface' | 'inverted' | 'accent'

type CardProps = HTMLAttributes<HTMLElement> & {
  tone?: CardTone
  as?: 'div' | 'section' | 'article'
  children: ReactNode
}

const TONE_CLASS: Record<CardTone, string> = {
  surface: styles.surface,
  inverted: styles.inverted,
  accent: styles.accent,
}

export function Card({ tone = 'surface', as: Tag = 'div', className, children, ...rest }: CardProps) {
  const classes = [styles.card, TONE_CLASS[tone], className].filter(Boolean).join(' ')

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}

// Fondo del cuadrito del ícono: 'inverted' (tinta-2 dentro de la tarjeta oscura),
// 'accent' (lavanda suave), 'warm' (cálido de apoyo), 'surface' (crema, dentro de --accent-soft).
type IconTone = 'inverted' | 'accent' | 'warm' | 'surface'

const ICON_TONE_CLASS: Record<IconTone, string> = {
  inverted: styles.iconInverted,
  accent: styles.iconAccent,
  warm: styles.iconWarm,
  surface: styles.iconSurface,
}

type CardHeaderProps = {
  id: string
  title: ReactNode
  subtitle?: ReactNode
  icon: ReactNode
  iconTone?: IconTone
  action?: ReactNode
}

// Encabezado de tarjeta del canvas: [ícono] Título · subtítulo ............ acción
export function CardHeader({ id, title, subtitle, icon, iconTone = 'accent', action }: CardHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.heading}>
        <span className={[styles.icon, ICON_TONE_CLASS[iconTone]].join(' ')} aria-hidden="true">
          {icon}
        </span>
        <div className={styles.titles}>
          <h2 id={id} className={styles.title}>
            {title}
          </h2>
          {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
        </div>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  )
}

// Ícono de línea de 18px como los del canvas. Recibe uno o varios `d`.
export function LineIcon({ d, size = 18, strokeWidth = 1.8 }: { d: string | string[]; size?: number; strokeWidth?: number }) {
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}

// Enlace de la esquina de una tarjeta ("Ver metas", "Semana"). La flecha se
// asoma al pasar el mouse para que se note que lleva a otra pantalla.
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.link}>
      {children}
      <svg className={styles.linkArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  )
}
