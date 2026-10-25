import type { ReactNode } from 'react'

import type { SpeciesDoodle } from '../../world-utils'

// Los dibujos de la wiki de un mundo, del canvas (Escritos.dc.html): uno por especie, uno por tipo de sección
// extra, el paisaje de día y de noche de una región y el de una persona sin foto. Los colores salen de las
// variables semánticas; `ink` es el color del trazo (claro sobre una tarjeta oscura).

type DoodleProps = { size?: number; ink?: string }

function Frame({ size = 44, ink = 'var(--text)', children }: DoodleProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

const SPECIES: Record<SpeciesDoodle, ReactNode> = {
  fairy: (
    <>
      <path d="M20 20c-3-8-11-12-14-8s1 9 14 8zM20 20c3-8 11-12 14-8s-1 9-14 8z" fill="var(--accent)" />
      <path d="M20 20c-2 5-7 9-10 7s0-6 10-7zM20 20c2 5 7 9 10 7s0-6-10-7z" fill="var(--accent-soft)" />
      <path d="M20 13v15" />
    </>
  ),
  human: (
    <>
      <circle cx="20" cy="13" r="5.5" fill="var(--accent-warm)" />
      <path d="M9 34c1-8 5-12 11-12s10 4 11 12z" fill="var(--accent-warm)" />
    </>
  ),
  shifter: (
    <>
      <path d="M20 20c5 0 8 4 8 8 0 3-3 5-8 5s-8-2-8-5c0-4 3-8 8-8z" fill="var(--accent)" />
      <circle cx="10.5" cy="17" r="3" fill="var(--accent)" />
      <circle cx="16" cy="10.5" r="3" fill="var(--accent)" />
      <circle cx="24" cy="10.5" r="3" fill="var(--accent)" />
      <circle cx="29.5" cy="17" r="3" fill="var(--accent)" />
    </>
  ),
  vampire: (
    <>
      <path d="M7 14c5 3 21 3 26 0-1 10-6 16-13 16S8 24 7 14z" fill="var(--danger-on-inverted)" />
      <path d="M13 16.5l2.4 7 2.2-6.4M22.4 17.1l2.2 6.4 2.4-7" fill="var(--surface)" />
    </>
  ),
  wolf: (
    <>
      <path d="M9 7l6 8h10l6-8 1 15-12 12L8 22z" fill="var(--border-control)" />
      <path d="M17 26l3 3 3-3" />
      <circle cx="15.5" cy="20" r="1.2" fill="var(--text)" />
      <circle cx="24.5" cy="20" r="1.2" fill="var(--text)" />
    </>
  ),
  witch: (
    <>
      <path d="M5 31c5 2.4 25 2.4 30 0" />
      <path d="M11 30L19 7c.5-1.6 2.2-1.6 2.8 0L29 30z" fill="var(--accent)" />
      <path d="M13 25h14" />
    </>
  ),
  dragon: <path d="M20 35c-7 0-11-5-10-11 1-5 5-6 5-11 4 2 6 6 5 10 2-1 3-3 3-5 4 3 6 7 6 11 0 4-4 6-9 6z" fill="var(--cover-peach)" />,
  other: (
    <>
      <circle cx="20" cy="20" r="10" fill="var(--surface-muted)" />
      <path d="M16 20h8M20 16v8" />
    </>
  ),
}

export function SpeciesArt({ kind, ...props }: DoodleProps & { kind: SpeciesDoodle }) {
  return <Frame {...props}>{SPECIES[kind]}</Frame>
}

// El dibujo de una sección extra según de qué trata, por su nombre (Magia, Objetos, Linajes, Deidades, Religión).
export type SectionDoodle = 'magic' | 'object' | 'lineage' | 'deity' | 'religion' | 'place' | 'person' | 'book' | 'other'

const SECTION_DOODLES: [RegExp, SectionDoodle][] = [
  [/magi|hechiz/i, 'magic'],
  [/objet|arma|artefact/i, 'object'],
  [/linaj|famil|casa/i, 'lineage'],
  [/deidad|dios/i, 'deity'],
  [/religi|culto|fe\b/i, 'religion'],
]

export const sectionDoodleOf = (name: string): SectionDoodle => SECTION_DOODLES.find(([pattern]) => pattern.test(name))?.[1] ?? 'other'

const SECTION: Record<SectionDoodle, ReactNode> = {
  magic: <path d="M20 4c1 9 5 13 15 16-10 2-14 6-15 16-1-10-5-14-15-16 10-3 14-7 15-16z" fill="var(--accent)" />,
  object: (
    <>
      <path d="M24 6h10v10L19 31l-10-10z" fill="var(--accent-warm)" />
      <path d="M11 23l6 6M7 27l6 6M6 34l3-3" />
    </>
  ),
  lineage: (
    <>
      <circle cx="20" cy="9" r="4.5" fill="var(--accent-warm)" />
      <circle cx="9" cy="31" r="4" fill="var(--accent)" />
      <circle cx="20" cy="31" r="4" fill="var(--accent)" />
      <circle cx="31" cy="31" r="4" fill="var(--accent)" />
      <path d="M20 13.5v8M9 27v-5.5h22V27M20 21.5V27" />
    </>
  ),
  deity: (
    <>
      <circle cx="20" cy="20" r="7" fill="var(--accent-warm)" />
      <path d="M20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M8.7 31.3l3.5-3.5M27.8 12.2l3.5-3.5" />
    </>
  ),
  religion: (
    <>
      <path d="M15 35V19h9v16z" fill="var(--surface)" />
      <path d="M19.5 19v-3" />
      <path d="M19.5 15.5c-2.2-2-1.4-5.2 0-7.5 1.4 2.3 2.2 5.5 0 7.5z" fill="var(--cover-peach)" />
      <path d="M31 6a5.5 5.5 0 1 0 3.4 9.8A4.6 4.6 0 0 1 31 6z" fill="var(--accent)" />
    </>
  ),
  place: (
    <>
      <path d="M4 32l9-12 6 7 6-10 11 15z" fill="var(--accent-warm)" />
      <circle cx="29" cy="10" r="4" fill="var(--surface)" />
    </>
  ),
  person: (
    <>
      <circle cx="20" cy="14" r="6" fill="var(--accent-warm)" />
      <path d="M8 35c1-8 6-12 12-12s11 4 12 12z" fill="var(--accent)" />
    </>
  ),
  book: (
    <>
      <path d="M7 8h11a3 3 0 0 1 3 3v22a3 3 0 0 0-3-3H7z" fill="var(--accent-warm)" />
      <path d="M33 8H22a3 3 0 0 0-3 3v22a3 3 0 0 1 3-3h11z" fill="var(--accent)" />
    </>
  ),
  other: <circle cx="20" cy="20" r="10" fill="var(--surface-muted)" />,
}

export function SectionArt({ kind, ...props }: DoodleProps & { kind: SectionDoodle }) {
  return <Frame {...props}>{SECTION[kind]}</Frame>
}

// El paisaje de una región (Escritos.dc.html, pestaña Regiones): de día (Vadronia) o de noche (Nocturnia).
export function RegionArt({ dark, className }: { dark: boolean; className?: string }) {
  if (dark) {
    return (
      <svg className={className} viewBox="0 0 600 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="600" height="150" fill="var(--surface-inverted-sunken)" />
        <g fill="var(--text-on-inverted)" opacity="0.6">
          <circle cx="60" cy="30" r="1.6" />
          <circle cx="180" cy="20" r="1.2" />
          <circle cx="300" cy="50" r="1.4" />
          <circle cx="420" cy="26" r="1.2" />
        </g>
        <circle cx="110" cy="56" r="30" fill="var(--accent)" />
        <circle cx="124" cy="48" r="28" fill="var(--surface-inverted-sunken)" />
        <path
          d="M0 150v-40l20-30 16 30 18-46 18 46 16-30 20 30 18-40 18 40 22-36 18 36 20-28 18 28 22-44 20 44 18-30 20 30 22-40 18 40 20-34 18 34 22-46 20 46 18-30 18 30 20-36 18 36 22-30 20 30 18-40 18 40V150z"
          fill="var(--surface-inverted)"
          stroke="var(--surface-inverted-muted)"
          strokeWidth="2"
        />
        <circle cx="440" cy="98" r="3" fill="var(--accent-warm)" />
        <circle cx="452" cy="98" r="3" fill="var(--accent-warm)" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 600 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="600" height="150" fill="var(--accent-warm)" />
      <circle cx="500" cy="48" r="26" fill="var(--surface)" stroke="var(--text)" strokeWidth="3" />
      <path d="M0 150l90-70 70 40 80-60 90 70 70-35 90 55H0z" fill="var(--border-control)" stroke="var(--text)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M250 150v-46h16v-14h14v14h12v-20h16v20h12v-14h14v14h16v46z" fill="var(--text)" />
      <path d="M150 40c1 10 5 15 18 18-13 2-17 7-18.6 19.4C147.6 65 143 60 131 58.6c12-3.4 17-9 19-18.6z" fill="var(--accent)" stroke="var(--text)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

// Una persona dibujada, para quien todavía no tiene foto pero sí se quiere ver con cara (el canvas la usa como
// "foto" de ejemplo). Se usa la inicial en su lugar; este dibujo queda para la portada automática de un personaje.
export function PersonArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      <path d="M11 17c0-7 4-11 9-11s9 4 9 11c0 3-1 5-2 6H13c-1-1-2-3-2-6z" fill="var(--surface-inverted-muted)" />
      <circle cx="20" cy="18" r="7" fill="var(--accent-warm)" stroke="var(--text)" strokeWidth="1.6" />
      <path d="M6 41c1-8 7-13 14-13s13 5 14 13z" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.6" />
    </svg>
  )
}
