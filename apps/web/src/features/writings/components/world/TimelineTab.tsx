'use client'

import { motion } from 'motion/react'
import { useState } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { fadeUp, staggerList } from '@/lib/motion'

import { createEraAction, createEventAction } from '../../timeline-actions'
import { plural } from '../../writing-utils'
import { eventMeta, romanOf } from '../../world-utils'

import styles from './World.module.css'
import tab from './TimelineTab.module.css'
import { useWorld } from './WorldContext'

// Mundo → Línea del tiempo (EscritosLinea.dc.html): las eras como botones (y "+ Nueva era") y, de la elegida, su
// resumen, tu nota y sus eventos en orden. Picar un evento lo abre en el panel; "Editar era" abre la era. Elegir
// otra era es un cambio dentro de la misma pantalla, no de ruta. `?era=` abre una directamente (la usa el Resumen).
export function TimelineTab({ initialEraId }: { initialEraId: string | null }) {
  const { bundle, index, open, run } = useWorld()
  const [selected, setSelected] = useState(initialEraId)
  const position = Math.max(0, bundle.eras.findIndex((era) => era.id === selected))
  const era = bundle.eras[position]
  const events = era ? bundle.events.filter((event) => event.eraId === era.id) : []

  function addEra() {
    run(() => createEraAction(bundle.world.id, { name: 'Era nueva' }), {
      onDone: (result) => {
        if (!result.id) return
        setSelected(result.id)
        open({ kind: 'era', id: result.id })
      },
    })
  }

  function addEvent() {
    if (!era) return
    run(() => createEventAction({ eraId: era.id, title: 'Evento nuevo' }), { onDone: (result) => result.id && open({ kind: 'event', id: result.id, edit: true }) })
  }

  return (
    <motion.div className={tab.wrap} variants={staggerList(0.05)} initial="hidden" animate="show">
      <motion.div className={tab.eras} variants={fadeUp}>
        {bundle.eras.map((item, itemPosition) => {
          const count = bundle.events.filter((event) => event.eraId === item.id).length
          const on = item.id === era?.id
          return (
            <button key={item.id} type="button" className={[tab.era, on ? tab.eraOn : null].filter(Boolean).join(' ')} aria-pressed={on} onClick={() => setSelected(item.id)}>
              <span className={tab.eraNumber}>{romanOf(itemPosition)}</span>
              <span className={tab.eraName}>{item.name}</span>
              <span className={tab.eraCount}>{count ? plural(count, 'evento', 'eventos') : 'Sin eventos aún'}</span>
            </button>
          )
        })}
        <button type="button" className={[tab.era, tab.eraAdd].join(' ')} onClick={addEra}>
          <span className={tab.eraNumber}>+</span>
          <span className={tab.eraName}>Nueva era</span>
        </button>
      </motion.div>

      {era ? (
        <motion.section className={tab.panel} variants={fadeUp} aria-labelledby="world-era">
          <div className={tab.panelHead}>
            <div className={tab.panelTitles}>
              <span className={styles.hint}>Era {romanOf(position)}</span>
              <h2 id="world-era" className={styles.h2Big}>
                {era.name}
              </h2>
              {era.summary ? <p className={tab.summary}>{era.summary}</p> : null}
            </div>
            <div className={styles.row}>
              {era.note ? (
                <span className={tab.note}>
                  <LineIcon d="M14 4l6 6L9 21H3v-6L14 4z" size={14} strokeWidth={2} />
                  Tu nota: {era.note}
                </span>
              ) : null}
              <button type="button" className={tab.editEra} onClick={() => open({ kind: 'era', id: era.id })}>
                <LineIcon d="M14 4l6 6L9 21H3v-6L14 4z" size={16} />
                Editar era
              </button>
            </div>
          </div>

          <ol className={tab.events}>
            {events.map((event, eventPosition) => {
              const meta = eventMeta(bundle, event, index)
              const edge = eventPosition === 0 || eventPosition === events.length - 1
              return (
                <li key={event.id} className={tab.event}>
                  <div className={tab.rail}>
                    <span className={[tab.dot, edge ? tab.dotEdge : null].filter(Boolean).join(' ')} />
                    {eventPosition < events.length - 1 ? <span className={tab.line} /> : null}
                  </div>
                  <div className={tab.eventBody}>
                    <button type="button" className={tab.eventButton} onClick={() => open({ kind: 'event', id: event.id, edit: false })}>
                      <span className={tab.eventTitle}>{event.title}</span>
                      {event.description ? <span className={tab.eventText}>{event.description}</span> : null}
                      {meta ? <span className={tab.eventMeta}>{meta}</span> : null}
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
          <button type="button" className={styles.ghost} onClick={addEvent}>
            + Agregar evento
          </button>
          {events.length === 0 ? (
            <div className={styles.empty}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="var(--surface)" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 29c-4.4.2-6.6-3-5.8-6.2.8-3 3.6-4.2 6-3.6.6-4.6 4.8-7.4 9-6.4 3.4.8 5.2 3.4 5.6 6 3.6-.8 7.6 1.6 7.6 5.4 0 3.4-2.6 5-5.6 5-5.6.2-11.2 0-16.8-.2z" />
              </svg>
              <span>Esta era todavía no tiene eventos. Agrega el primero cuando tengas la idea clara.</span>
            </div>
          ) : null}
        </motion.section>
      ) : (
        <motion.div className={[styles.empty, styles.emptyDashed].join(' ')} variants={fadeUp}>
          <span>Todavía no hay eras. La línea del tiempo de {bundle.world.name} empieza con la primera: pícale a “Nueva era”.</span>
        </motion.div>
      )}
    </motion.div>
  )
}
