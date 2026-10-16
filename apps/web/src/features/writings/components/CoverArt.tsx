import type { CoverPreset } from '../writing-utils'

import styles from './CoverArt.module.css'

// Las tres ilustraciones de portada de una nota (EscritosInicio): un mapa, una paleta de colores y un paisaje.
// Mientras no se puedan subir imágenes, una nota con imagen lleva una de estas (`coverPath: 'preset:map'`), igual
// que los proyectos. Los colores salen de las variables semánticas.
export function CoverArt({ preset }: { preset: CoverPreset }) {
  if (preset === 'map') {
    return (
      <svg className={[styles.art, styles.map].join(' ')} viewBox="0 0 300 180" width="100%" aria-hidden="true">
        <path d="M30 120c20-40 60-60 90-50s40 40 70 30 50-50 80-40" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeDasharray="6 6" />
        <path
          d="M40 60c15-15 40-18 55-5 10 9 4 25-12 28-20 4-50-6-43-23zM180 110c18-12 46-8 56 8 7 11-4 24-22 24-26 0-48-18-34-32z"
          fill="var(--accent)"
          stroke="var(--text)"
          strokeWidth="2"
        />
        <text x="68" y="72" textAnchor="middle" fontFamily="var(--font-script)" fontSize="13" fill="var(--text)">
          Vadronia
        </text>
        <text x="208" y="129" textAnchor="middle" fontFamily="var(--font-script)" fontSize="13" fill="var(--text)">
          Nocturnia
        </text>
        <path d="M255 30l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z" fill="var(--surface)" stroke="var(--text)" strokeWidth="1.8" />
      </svg>
    )
  }

  if (preset === 'mood') {
    return (
      <div className={styles.mood} aria-hidden="true">
        <span className={styles.moodNight} />
        <span className={styles.moodGold} />
        <span className={styles.moodLavender} />
      </div>
    )
  }

  return (
    <svg className={[styles.art, styles.photo].join(' ')} viewBox="0 0 300 200" width="100%" aria-hidden="true">
      <circle cx="225" cy="58" r="22" fill="var(--surface)" />
      <path d="M0 160l70-70 50 45 40-35 80 70v30H0z" fill="var(--accent-ink)" />
      <path d="M0 175l90-50 70 40 60-30 80 40v25H0z" fill="var(--text)" />
    </svg>
  )
}
