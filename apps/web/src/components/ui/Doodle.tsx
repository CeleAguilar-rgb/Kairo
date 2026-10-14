import type { CSSProperties } from 'react'

// Los doodles a mano del canvas (bandeja "Doodles" de Main.dc.html). Siempre
// decorativos: aria-hidden y sin capturar clics (los envuelve quien los usa si
// hacen falta como botón). Colores solo por variables semánticas.
export type DoodleKind = 'star' | 'sun' | 'heart' | 'bolt' | 'cloud' | 'spiral' | 'coffee' | 'flower'

export const DOODLE_LABEL: Record<DoodleKind, string> = {
  star: 'Estrella',
  sun: 'Sol',
  heart: 'Corazón',
  bolt: 'Rayo',
  cloud: 'Nube',
  spiral: 'Espiral',
  coffee: 'Café',
  flower: 'Flor',
}

export const DOODLE_KINDS = Object.keys(DOODLE_LABEL) as DoodleKind[]

type Part = { d: string; fill?: 'accent' | 'warm' | 'surface' | 'none' }

const PARTS: Record<DoodleKind, Part[]> = {
  star: [{ d: 'M20 4c.8 8.4 4.2 12.6 15 15.6-10.6 1.6-14 5.6-15.4 16.2C18.4 25.4 14.6 21.4 5 20.2 14.8 17.4 18.8 13 20 4z', fill: 'accent' }],
  sun: [
    { d: 'M20 13.4c4.2-.4 6.8 2.6 6.6 6.6-.2 4-3.2 6.6-6.8 6.4-4-.2-6.4-3.2-6.2-6.8.2-3.6 2.8-5.8 6.4-6.2z', fill: 'warm' },
    { d: 'M20 4.5v4M20 31.5v4M4.5 20h4M31.5 20h4M9 9l2.8 2.8M28.2 28.2L31 31M31 9l-2.8 2.8M11.8 28.2L9 31' },
  ],
  heart: [{ d: 'M20 33C10.4 26.6 5.6 21 6.4 14.6c.8-5.4 7.8-7.6 13.4-1.4 5.2-6.4 13-4.4 13.8 1.2.8 6-4 12-13.6 18.6z', fill: 'accent' }],
  bolt: [{ d: 'M23 4L9.6 22.4h9.2L16 36l14.4-19.6h-9.4L23 4z', fill: 'warm' }],
  cloud: [{ d: 'M11 29c-4.4.2-6.6-3-5.8-6.2.8-3 3.6-4.2 6-3.6.6-4.6 4.8-7.4 9-6.4 3.4.8 5.2 3.4 5.6 6 3.6-.8 7.6 1.6 7.6 5.4 0 3.4-2.6 5-5.6 5-5.6.2-11.2 0-16.8-.2z', fill: 'surface' }],
  spiral: [{ d: 'M21 20.4c.6-1.8-1.6-2.8-3-1.6-1.8 1.6-.4 4.6 2 4.8 3.4.2 5.2-3.6 3.6-6.6-2-3.6-7.2-3.6-9.6-.4-2.8 3.8-.6 9.6 4.2 10.6 5.4 1.2 10.2-3 10-8.4' }],
  coffee: [
    { d: 'M8 16.4c6.6-.6 13.6-.6 20 0-.2 6.6-1.6 12.6-4 15.4-3.6.8-8.2.8-11.8 0C9.8 29 8.2 23.2 8 16.4z', fill: 'warm' },
    { d: 'M28 19c3.4-.6 5.2 1 4.8 3.4-.4 2.4-2.6 3.6-5.6 3.4' },
    { d: 'M14 11c-1.2-1.6 1-2.8 0-5M19.4 11c-1.2-1.6 1-2.8 0-5' },
  ],
  flower: [
    { d: 'M20 16.6c-2.6-5.2-.8-9.6 1.6-9.8 2.8-.2 3.4 4.6-1.6 9.8zM23.2 19c4.8-3.2 9.6-2.2 10 .4.4 2.8-4.6 3.8-10-.4zM21 23c4 4.4 3.4 9.2.8 9.8-2.6.6-4.2-4-.8-9.8zM16.8 21.6c-5.2 2.4-9.6.6-9.6-2 0-2.8 4.8-3.2 9.6 2zM16.4 17.6c-4.4-3.8-4.4-8.6-1.8-9.4 2.8-.8 4.2 3.8 1.8 9.4z', fill: 'accent' },
    { d: 'M17 20a3 3 0 1 0 6 0a3 3 0 1 0-6 0', fill: 'warm' },
  ],
}

const FILL: Record<NonNullable<Part['fill']>, string> = {
  accent: 'var(--accent)',
  warm: 'var(--accent-warm)',
  surface: 'var(--surface)',
  none: 'none',
}

type DoodleProps = {
  kind: DoodleKind
  size?: number
  // Color del trazo: tinta por defecto; 'inverted' sobre fondos oscuros, 'accent-ink' sobre lavanda.
  stroke?: 'text' | 'inverted' | 'accent-ink'
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}

const STROKE: Record<NonNullable<DoodleProps['stroke']>, string> = {
  text: 'var(--text)',
  inverted: 'var(--text-on-inverted)',
  'accent-ink': 'var(--accent-ink)',
}

export function Doodle({ kind, size = 40, stroke = 'text', strokeWidth = 2.2, className, style }: DoodleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke={STROKE[stroke]}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {PARTS[kind].map((part) => (
        <path key={part.d} d={part.d} fill={FILL[part.fill ?? 'none']} />
      ))}
    </svg>
  )
}
