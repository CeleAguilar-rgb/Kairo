'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { fadeUp, staggerList } from '@/lib/motion'

import type { WorldCard } from '../types'

import { WorldDrawer } from './WorldDrawer'
import styles from './WorldsView.module.css'

// Mundos (EscritosInicio, pestaña Mundos): una tarjeta oscura por mundo con su luna y sus cuentas, y "Nuevo mundo".
export function WorldsView({ worlds }: { worlds: WorldCard[] }) {
  const calm = useCalmEntry()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <motion.div className={styles.grid} variants={staggerList(0.08, 0.05)} initial={calm ? false : 'hidden'} animate="show">
        {worlds.map((world) => (
          <motion.div key={world.id} variants={fadeUp}>
            <Link href={`/escritos/mundos/${world.id}`} className={styles.world}>
              <svg className={styles.sky} viewBox="0 0 600 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <circle cx="470" cy="90" r="54" fill="var(--accent-warm)" />
                <circle cx="448" cy="78" r="54" fill="var(--surface-inverted)" />
                <g fill="var(--text-on-inverted)">
                  <circle cx="80" cy="40" r="2" />
                  <circle cx="180" cy="90" r="1.5" />
                  <circle cx="300" cy="30" r="2" />
                  <circle cx="360" cy="140" r="1.5" />
                  <circle cx="560" cy="200" r="2" />
                </g>
              </svg>
              <span className={styles.text}>
                <span className={styles.kicker}>Mundo</span>
                <span className={styles.name}>{world.name}</span>
                <span className={styles.counts}>{world.countsText}</span>
              </span>
            </Link>
          </motion.div>
        ))}

        <motion.div variants={fadeUp}>
          <button type="button" className={styles.add} onClick={() => setDrawerOpen(true)}>
            <svg width="44" height="44" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="20" cy="20" r="13" fill="var(--accent-soft)" />
              <path d="M7 20h26M20 7c4 4 6 8.5 6 13s-2 9-6 13c-4-4-6-8.5-6-13s2-9 6-13z" />
            </svg>
            <span className={styles.addTitle}>Nuevo mundo</span>
            <span className={styles.hint}>Regiones, eras, personajes y especies</span>
          </button>
        </motion.div>
      </motion.div>

      <WorldDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
