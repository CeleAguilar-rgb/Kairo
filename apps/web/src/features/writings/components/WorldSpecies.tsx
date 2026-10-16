'use client'

import { motion } from 'motion/react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { fadeUp, staggerList } from '@/lib/motion'

import type { SpeciesView } from '../types'

import styles from './WorldSpecies.module.css'

// Especies del mundo (Escritos.dc.html): una tarjeta por especie con su región y de qué trata; las de regiones
// oscuras (Nocturnia) van en tarjeta oscura.
export function WorldSpecies({ view }: { view: SpeciesView }) {
  const calm = useCalmEntry()

  if (view.species.length === 0) {
    return <EmptyState id="world-species-empty" title="Todavía no hay especies" description="Las especies son quienes viven en tu mundo: humanos, hadas, dragones… cada una con su región." doodle="flower" />
  }

  return (
    <motion.div className={styles.grid} variants={staggerList(0.05, 0.05)} initial={calm ? false : 'hidden'} animate="show">
      {view.species.map((item) => (
        <motion.article key={item.id} className={[styles.card, item.dark ? styles.dark : null].filter(Boolean).join(' ')} variants={fadeUp}>
          <div className={styles.head}>
            <h2 className={styles.name}>{item.name}</h2>
            {item.regionName ? <span className={styles.region}>{item.regionName}</span> : null}
          </div>
          <p className={styles.description}>{item.description}</p>
        </motion.article>
      ))}
    </motion.div>
  )
}
