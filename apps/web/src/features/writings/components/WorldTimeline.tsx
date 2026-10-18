'use client'

import { motion } from 'motion/react'
import { useState } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Card, LineIcon } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { fadeUp, staggerList } from '@/lib/motion'

import type { TimelineView } from '../types'
import { WRITING_ICON } from '../writing-meta'
import { plural } from '../writing-utils'

import styles from './WorldTimeline.module.css'

// Línea del tiempo (Escritos.dc.html): las eras como botones y, de la elegida, su resumen, tu nota y sus eventos en
// orden. Cambiar de era es un cambio dentro de la misma pantalla, no de ruta.
export function WorldTimeline({ view }: { view: TimelineView }) {
  const calm = useCalmEntry()
  const [eraId, setEraId] = useState(view.initialEraId)

  if (view.eras.length === 0) {
    return <EmptyState id="world-timeline-empty" title="Todavía no hay eras" description="La línea del tiempo de este mundo se arma con sus eras y los eventos de cada una." doodle="sun" />
  }

  const era = view.eras.find((item) => item.id === eraId) ?? view.eras[0]

  return (
    <motion.div className={styles.wrap} variants={staggerList(0.08, 0.05)} initial={calm ? false : 'hidden'} animate="show">
      <motion.div className={styles.eras} variants={fadeUp}>
        {view.eras.map((item) => {
          const on = item.id === era.id
          return (
            <button key={item.id} type="button" className={[styles.eraButton, on ? styles.eraOn : null].filter(Boolean).join(' ')} aria-pressed={on} onClick={() => setEraId(item.id)}>
              <span className={styles.eraNumber}>{item.number}</span>
              <span className={styles.eraName}>{item.name}</span>
              <span className={styles.eraCount}>{item.events.length ? plural(item.events.length, 'evento', 'eventos') : 'Sin eventos aún'}</span>
            </button>
          )
        })}
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card as="section" className={styles.panel} aria-labelledby="world-era">
          <div className={styles.panelHead}>
            <div className={styles.panelTitles}>
              <span className={styles.kicker}>Era {era.number}</span>
              <h2 id="world-era" className={styles.panelTitle}>
                {era.name}
              </h2>
              <p className={styles.summary}>{era.summary}</p>
            </div>
            {era.note ? (
              <span className={styles.note}>
                <LineIcon d={WRITING_ICON.pencil} size={14} strokeWidth={2} />
                Tu nota: {era.note}
              </span>
            ) : null}
          </div>

          <ol className={styles.events}>
            {era.events.map((event, index) => {
              const last = index === era.events.length - 1
              return (
                <li key={event.id} className={styles.event}>
                  <div className={styles.rail}>
                    <span className={[styles.dot, index === 0 || last ? styles.dotEnd : styles.dotMid].join(' ')} />
                    <span className={[styles.line, last ? styles.lineLast : null].filter(Boolean).join(' ')} />
                  </div>
                  <div className={styles.eventText}>
                    <span className={styles.eventTitle}>{event.title}</span>
                    <span className={styles.eventDescription}>{event.description}</span>
                  </div>
                </li>
              )
            })}
          </ol>

          {era.events.length === 0 ? (
            <div className={styles.empty}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="var(--surface)" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 29c-4.4.2-6.6-3-5.8-6.2.8-3 3.6-4.2 6-3.6.6-4.6 4.8-7.4 9-6.4 3.4.8 5.2 3.4 5.6 6 3.6-.8 7.6 1.6 7.6 5.4 0 3.4-2.6 5-5.6 5-5.6.2-11.2 0-16.8-.2z" />
              </svg>
              <span>Esta era todavía no tiene eventos. Agrega el primero cuando tengas la idea clara.</span>
            </div>
          ) : null}
        </Card>
      </motion.div>
    </motion.div>
  )
}
