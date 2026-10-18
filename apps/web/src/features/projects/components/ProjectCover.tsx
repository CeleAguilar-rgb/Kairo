import type { ReactNode } from 'react'

import type { ProjectCoverKey } from '../types'

// Las ilustraciones de portada de Proyectos.dc.html, una por proyecto. Los colores del canvas
// se traducen a variables semánticas (regla 5: nada de colores directos en componentes), en
// este orden: tinta → --text / --surface-inverted, lavanda → --accent, lavanda suave →
// --accent-soft, crema → --surface, cálido → --accent-warm, arena → --surface-muted.
const INK = 'var(--text)'
const DARK = 'var(--surface-inverted)'
const LAVENDER = 'var(--accent)'
const LAVENDER_SOFT = 'var(--accent-soft)'
const PAPER = 'var(--surface)'
const WARM = 'var(--accent-warm)'
const CREAM_ON_DARK = 'var(--text-on-inverted)'
const SAND = 'var(--surface-muted)'
const RAISED = 'var(--surface-raised)'

const ART: Record<ProjectCoverKey, ReactNode> = {
  // Las cuatro del formulario de proyecto (ProyectoEditar.dc.html)
  // Luna: una luna creciente en un cielo oscuro
  luna: (
    <>
      <rect width="400" height="200" fill={DARK} />
      <circle cx="270" cy="96" r="58" fill={WARM} />
      <circle cx="296" cy="82" r="54" fill={DARK} />
      <g fill={CREAM_ON_DARK}>
        <circle cx="80" cy="50" r="3" />
        <circle cx="150" cy="120" r="2" />
        <circle cx="350" cy="160" r="2.5" />
      </g>
    </>
  ),
  // Tablero: los bloques de un tablero, más simples que los de Dashboard personal
  tablero: (
    <>
      <rect width="400" height="200" fill={LAVENDER_SOFT} />
      <rect x="90" y="40" width="100" height="74" rx="16" fill={DARK} />
      <rect x="204" y="40" width="70" height="44" rx="14" fill={PAPER} stroke={INK} strokeWidth="4" />
      <rect x="204" y="98" width="70" height="66" rx="14" fill={LAVENDER} stroke={INK} strokeWidth="4" />
      <rect x="90" y="128" width="100" height="36" rx="14" fill={PAPER} stroke={INK} strokeWidth="4" />
    </>
  ),
  // Olas: dos olas y un sol
  olas: (
    <>
      <rect width="400" height="200" fill={WARM} />
      <circle cx="300" cy="64" r="30" fill={PAPER} stroke={INK} strokeWidth="4" />
      <path
        d="M0 130c40-20 80 20 120 0s80-20 120 0 80 20 120 0 40-10 40-10M0 166c40-20 80 20 120 0s80-20 120 0 80 20 120 0 40-10 40-10"
        fill="none"
        stroke={INK}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </>
  ),
  // Estrella: una estrella grande con dos círculos de adorno
  estrella: (
    <>
      <rect width="400" height="200" fill={PAPER} />
      <path
        d="M200 26c3 32 16 48 56 60-40 6-52 22-57 62-6-40-20-54-56-58 36-10 52-28 57-64z"
        fill={LAVENDER}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <circle cx="90" cy="150" r="14" fill={WARM} stroke={INK} strokeWidth="4" />
      <circle cx="320" cy="50" r="10" fill={LAVENDER_SOFT} stroke={INK} strokeWidth="4" />
    </>
  ),
  // Dashboard personal: bloques de un tablero y una chispa
  dash: (
    <>
      <rect width="400" height="200" fill={LAVENDER_SOFT} />
      <rect x="74" y="38" width="96" height="74" rx="16" fill={DARK} />
      <rect x="184" y="38" width="64" height="44" rx="14" fill={PAPER} stroke={INK} strokeWidth="3" />
      <rect x="184" y="96" width="64" height="70" rx="14" fill={LAVENDER} stroke={INK} strokeWidth="3" />
      <rect x="74" y="126" width="96" height="40" rx="14" fill={PAPER} stroke={INK} strokeWidth="3" />
      <path
        d="M318 34c1.4 14 7 21 25 26-17.6 2.6-23.4 9.4-25.6 27-2.6-17.4-9-24-25-26 16.4-4.6 23-12 25.6-27z"
        fill={PAPER}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M270 150c14-8 26 6 42-1s26-6 40 2" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  // Bot de marketing: dos globos de chat y un rayo, sobre fondo oscuro
  bot: (
    <>
      <rect width="400" height="200" fill={DARK} />
      <rect x="62" y="44" width="170" height="62" rx="31" fill={LAVENDER} />
      <path d="M92 104l-6 22 26-18z" fill={LAVENDER} />
      <circle cx="112" cy="75" r="7" fill={DARK} />
      <circle cx="146" cy="75" r="7" fill={DARK} />
      <circle cx="180" cy="75" r="7" fill={DARK} />
      <rect x="170" y="118" width="160" height="50" rx="25" fill={CREAM_ON_DARK} />
      <path d="M304 166l10 18-26-14z" fill={CREAM_ON_DARK} />
      <rect x="194" y="136" width="84" height="8" rx="4" fill={DARK} />
      <rect x="194" y="150" width="54" height="8" rx="4" fill={LAVENDER} />
      <path d="M330 24L304 62h18l-6 28 30-40h-19z" fill={WARM} stroke={CREAM_ON_DARK} strokeWidth="2.5" strokeLinejoin="round" />
    </>
  ),
  // VinculaPSI: dos círculos que se encuentran con un corazón en medio
  vin: (
    <>
      <rect width="400" height="200" fill={PAPER} />
      <circle cx="168" cy="102" r="62" fill={LAVENDER} stroke={INK} strokeWidth="3" />
      <circle cx="236" cy="102" r="62" fill="none" stroke={INK} strokeWidth="3" />
      <path d="M202 128c-12-8-18-15-17-23 1-7 10-9 17-1 7-8 16-6 17 1 1 8-5 15-17 23z" fill={DARK} />
      <circle cx="330" cy="44" r="14" fill={WARM} stroke={INK} strokeWidth="2.5" />
      <circle cx="64" cy="160" r="10" fill={LAVENDER_SOFT} stroke={INK} strokeWidth="2.5" />
    </>
  ),
  // Juego de peluches: un peluche con ojos de X
  pel: (
    <>
      <rect width="400" height="200" fill={WARM} />
      <path
        d="M150 176c-30 0-44-22-40-52 2-18 10-30 6-48-3-14 8-24 20-18 10 5 14 12 26 12h56c12 0 16-7 26-12 12-6 23 4 20 18-4 18 4 30 6 48 4 30-10 52-40 52z"
        fill={PAPER}
        stroke={INK}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M164 104l16 16M180 104l-16 16" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="234" cy="112" r="9" fill={DARK} />
      <path d="M190 142c8 6 20 6 28 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M256 70l14 30M262 74l-8 6M266 84l-8 6M270 94l-8 6" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="330" cy="150" r="16" fill={LAVENDER} stroke={INK} strokeWidth="3" />
      <circle cx="325" cy="146" r="2.5" fill={DARK} />
      <circle cx="335" cy="146" r="2.5" fill={DARK} />
      <circle cx="325" cy="155" r="2.5" fill={DARK} />
      <circle cx="335" cy="155" r="2.5" fill={DARK} />
    </>
  ),
  // 67downloader: el "67" a mano y un botón de descarga
  d67: (
    <>
      <rect width="400" height="200" fill={RAISED} />
      <text x="70" y="158" fontSize="140" fill={INK} style={{ fontFamily: 'var(--font-script)' }}>
        67
      </text>
      <circle cx="290" cy="100" r="50" fill={DARK} />
      <path d="M290 74v44M272 102l18 18 18-18" fill="none" stroke={LAVENDER} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M248 168h84" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  // Web para foráneos: un plato con vapor, un sol y su comida
  web: (
    <>
      <rect width="400" height="200" fill={LAVENDER} />
      <path d="M110 108h180c0 44-40 70-90 70s-90-26-90-70z" fill={PAPER} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M96 108h208" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M168 88c-8-10 6-16 0-28M200 88c-8-10 6-16 0-28M232 88c-8-10 6-16 0-28" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="70" cy="150" r="18" fill={WARM} stroke={INK} strokeWidth="3" />
      <path d="M70 124v6M70 170v6M44 150h6M90 150h6" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  // Ingeniería o maestría: libros apilados y un birrete
  ing: (
    <>
      <rect width="400" height="200" fill={SAND} />
      <rect x="120" y="140" width="170" height="28" rx="6" fill={DARK} />
      <rect x="132" y="112" width="150" height="28" rx="6" fill={LAVENDER} stroke={INK} strokeWidth="3" />
      <rect x="114" y="84" width="160" height="28" rx="6" fill={PAPER} stroke={INK} strokeWidth="3" />
      <path d="M200 26l70 24-70 24-70-24z" fill={DARK} />
      <path d="M164 62v14c20 12 52 12 72 0V62" fill="none" stroke={INK} strokeWidth="3" />
      <path d="M262 54v26" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="262" cy="84" r="5" fill={WARM} stroke={INK} strokeWidth="2" />
    </>
  ),
}

// Dibuja la portada que llena su contenedor (se recorta como "cover" de una imagen).
export function ProjectCover({ coverKey, className }: { coverKey: ProjectCoverKey; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {ART[coverKey]}
    </svg>
  )
}
