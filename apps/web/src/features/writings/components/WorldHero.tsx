import { LineIcon } from '@/components/ui/Card'

import { formatCount } from '../writing-utils'
import type { WorldStat } from '../world-utils'

import styles from './WorldHero.module.css'

type WorldHeroProps = { name: string; description: string; stats: WorldStat[]; onEditStats: () => void }

// La portada de un mundo (Escritos.dc.html): una tarjeta oscura con su luna, su nombre a mano, de qué trata y las
// cifras que se eligieron (eras, regiones, reinos…); el lápiz de al lado abre "Contadores". Vive en el layout del
// mundo, así que al cambiar de pestaña no se vuelve a pintar.
export function WorldHero({ name, description, stats, onEditStats }: WorldHeroProps) {
  return (
    <section className={styles.hero} aria-label={name}>
      <svg className={styles.sky} viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g fill="var(--text-on-inverted)" opacity="0.55">
          <circle cx="120" cy="40" r="1.6" />
          <circle cx="260" cy="90" r="1.2" />
          <circle cx="420" cy="30" r="1.8" />
          <circle cx="560" cy="70" r="1.2" />
          <circle cx="700" cy="24" r="1.4" />
          <circle cx="1150" cy="60" r="1.6" />
          <circle cx="1060" cy="250" r="1.2" />
          <circle cx="640" cy="140" r="1" />
          <circle cx="340" cy="150" r="1.2" />
        </g>
        <g className={styles.moon}>
          <circle cx="930" cy="128" r="86" fill="var(--accent-warm)" />
          <circle cx="964" cy="108" r="78" fill="var(--surface-inverted)" />
        </g>
        <path d="M760 300c40-60 90-78 140-62s80 4 110-30 90-40 150 6v86z" fill="var(--surface-inverted-muted)" />
        <path d="M600 300c50-40 110-60 170-40s110 10 150-10 110-20 180 20v30z" fill="var(--surface-inverted-sunken)" />
        <path d="M1020 40c1.2 12 6 18 21 22-15 2.2-20 8-22 23-2.2-15-7.6-20.6-21.4-22.4 14-4 19.8-10.4 22.4-22.6z" fill="var(--accent)" stroke="var(--text-on-inverted)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className={styles.content}>
        <div className={styles.titles}>
          <span className={styles.kicker}>Mundo</span>
          <h1 className={styles.name}>{name}</h1>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        <div className={styles.stats}>
          {stats.map((stat) => (
            <span key={stat.id} className={styles.stat}>
              <span className={styles.statValue}>{formatCount(stat.value)}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </span>
          ))}
          <button type="button" className={styles.editStats} aria-label="Elegir qué contar" onClick={onEditStats}>
            <LineIcon d="M14 4l6 6L9 21H3v-6L14 4z" size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}
