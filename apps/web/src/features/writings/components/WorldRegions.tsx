'use client'

import { motion } from 'motion/react'
import Link from 'next/link'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LineIcon } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { fadeUp, staggerList } from '@/lib/motion'

import type { RegionsView } from '../types'
import { WRITING_ICON } from '../writing-meta'

import styles from './WorldRegions.module.css'

// Regiones (Escritos.dc.html): una tarjeta por región con su ilustración, de qué trata, sus reinos (tocar uno abre sus
// personajes) y sus pueblos; las regiones oscuras (Nocturnia) llevan su paisaje de noche. Abajo, el lugar del mapa.
export function WorldRegions({ view }: { view: RegionsView }) {
  const calm = useCalmEntry()
  const toast = useToast()

  if (view.regions.length === 0) {
    return <EmptyState id="world-regions-empty" title="Todavía no hay regiones" description="Las regiones son los lugares de tu mundo: sus reinos, sus pueblos y lo que pasa en cada uno." doodle="cloud" />
  }

  return (
    <motion.div className={styles.grid} variants={staggerList(0.08, 0.05)} initial={calm ? false : 'hidden'} animate="show">
      {view.regions.map((region) => (
        <motion.section key={region.id} className={[styles.card, region.dark ? styles.dark : null].filter(Boolean).join(' ')} variants={fadeUp} aria-labelledby={`region-${region.id}`}>
          {region.dark ? <NightArt /> : <DayArt />}
          <div className={styles.body}>
            <div className={styles.titleRow}>
              <h2 id={`region-${region.id}`} className={styles.name}>
                {region.name}
              </h2>
              <span className={styles.tagline}>{region.tagline}</span>
            </div>
            <p className={styles.description}>{region.description}</p>

            {region.kingdomLinks.length > 0 ? (
              <>
                <h3 className={styles.subtitle}>Reinos</h3>
                <div className={styles.kingdoms}>
                  {region.kingdomLinks.map((kingdom) => (
                    <Link key={kingdom.name} href={kingdom.href} className={styles.kingdom}>
                      <span className={styles.kingdomName}>{kingdom.name}</span>
                      <span className={styles.kingdomCount}>{kingdom.countText}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : null}

            {region.peoples.length > 0 ? (
              <div className={styles.peoples}>
                {region.peoples.map((people) => (
                  <span key={people} className={styles.people}>
                    {people}
                  </span>
                ))}
              </div>
            ) : null}

            {!region.hasPage ? (
              <div className={styles.noPage}>
                <LineIcon d={WRITING_ICON.plus} size={20} />
                <span>Todavía no tiene página. Créala cuando empieces su historia.</span>
              </div>
            ) : null}
          </div>
        </motion.section>
      ))}

      {!view.hasMap ? (
        <motion.section className={styles.map} variants={fadeUp} aria-label="Mapa">
          <LineIcon d={WRITING_ICON.map} size={52} strokeWidth={1.5} />
          <span className={styles.mapTitle}>Aquí va tu mapa épico</span>
          <span>Súbelo y pon un pin en cada reino y bosque. Al picarlo se abre su ficha.</span>
          <Button onClick={() => toast.show({ message: 'Subir el mapa llega junto con la subida de imágenes.', icon: 'info' })}>Subir mapa</Button>
        </motion.section>
      ) : null}
    </motion.div>
  )
}

// La ilustración de una región clara (el día en Vadronia) y la de una oscura (la noche en Nocturnia), del canvas.
function DayArt() {
  return (
    <svg className={styles.art} viewBox="0 0 600 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="600" height="150" fill="var(--accent-warm)" />
      <circle cx="500" cy="48" r="26" fill="var(--surface)" stroke="var(--text)" strokeWidth="3" />
      <path d="M0 150l90-70 70 40 80-60 90 70 70-35 90 55H0z" fill="var(--border-control)" stroke="var(--text)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M250 150v-46h16v-14h14v14h12v-20h16v20h12v-14h14v14h16v46z" fill="var(--text)" />
      <path d="M150 40c1 10 5 15 18 18-13 2-17 7-18.6 19.4C147.6 65 143 60 131 58.6c12-3.4 17-9 19-18.6z" fill="var(--accent)" stroke="var(--text)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

function NightArt() {
  return (
    <svg className={styles.art} viewBox="0 0 600 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
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
