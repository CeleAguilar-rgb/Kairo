'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import type { CSSProperties } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Card, LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { fadeUp, staggerList } from '@/lib/motion'

import type { WorldSummaryView } from '../types'
import { WRITING_ICON } from '../writing-meta'

import styles from './WorldSummary.module.css'

// Resumen del mundo (Escritos.dc.html): "Dónde y cuándo", la matriz de cada región en cada era (tocar algo lo abre),
// a un lado "Huecos por llenar" y "Reglas del mundo".
export function WorldSummary({ view }: { view: WorldSummaryView }) {
  const calm = useCalmEntry()

  return (
    <motion.div className={styles.split} variants={staggerList(0.08, 0.05)} initial={calm ? false : 'hidden'} animate="show">
      <motion.div className={styles.grow} variants={fadeUp}>
        <Card as="section" className={styles.matrixCard} aria-labelledby="world-matrix">
          <div className={styles.head}>
            <div className={styles.headTitle}>
              <span className={styles.icon} aria-hidden="true">
                <LineIcon d={['M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z', 'M3 9h18M3 15h18M9 3v18M15 3v18']} />
              </span>
              <div className={styles.titles}>
                <h2 id="world-matrix" className={styles.title}>
                  Dónde y cuándo
                </h2>
                <span className={styles.hint}>Cada región en cada era. Toca algo para abrirlo.</span>
              </div>
            </div>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={[styles.swatch, styles.swatchStory].join(' ')} />
                Historia
              </span>
              <span className={styles.legendItem}>
                <span className={[styles.swatch, styles.swatchLore].join(' ')} />
                Lore o registro
              </span>
              <span className={styles.legendItem}>
                <span className={[styles.swatch, styles.swatchIdea].join(' ')} />
                Idea por escribir
              </span>
            </div>
          </div>

          {view.eras.length === 0 ? (
            <p className={styles.empty}>Este mundo todavía no tiene eras. Cuando las tenga, aquí verás qué pasa en cada región y en cada era.</p>
          ) : (
            <div className={styles.scroll}>
              <div className={styles.matrix} style={{ '--eras': view.eras.length } as CSSProperties}>
                <span />
                {view.eras.map((era) => (
                  <Link key={era.id} href={era.href} className={styles.eraHead}>
                    <span className={styles.eraNumber}>{era.number}</span>
                    <span className={styles.eraName}>{era.shortName}</span>
                  </Link>
                ))}
                {view.rows.map((row) => (
                  <MatrixRowCells key={row.id} row={row} />
                ))}
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.aside className={styles.side} variants={fadeUp} aria-label="Pendientes y reglas">
        <section className={styles.gaps} aria-labelledby="world-gaps">
          <span className={styles.gapsDoodle} aria-hidden="true">
            <Doodle kind="flower" size={44} strokeWidth={2} />
          </span>
          <h2 id="world-gaps" className={styles.title}>
            Huecos por llenar
          </h2>
          <span className={styles.gapsHint}>Lo que le falta a tu mundo</span>
          {view.gaps.length === 0 ? <p className={styles.gapsEmpty}>Nada pendiente: tu mundo está al día.</p> : null}
          {view.gaps.map((gap) => (
            <div key={gap.id} className={styles.gap}>
              <span className={styles.gapBox} aria-hidden="true" />
              <div className={styles.gapText}>
                <span className={styles.gapTitle}>{gap.title}</span>
                <span className={styles.gapDetail}>{gap.detail}</span>
              </div>
            </div>
          ))}
        </section>

        <Card as="section" className={styles.rules} aria-labelledby="world-rules">
          <div className={styles.headTitle}>
            <span className={[styles.icon, styles.iconWarm].join(' ')} aria-hidden="true">
              <LineIcon d={WRITING_ICON.moon} />
            </span>
            <h2 id="world-rules" className={styles.title}>
              Reglas del mundo
            </h2>
          </div>
          {view.rules.length === 0 ? <p className={styles.rulesEmpty}>Todavía no hay reglas. Aquí van la magia, las leyes y todo lo que no se puede romper.</p> : null}
          {view.rules.map((rule) => (
            <p key={rule.id} className={styles.rule}>
              <strong>{rule.title}:</strong> {rule.text}
            </p>
          ))}
        </Card>
      </motion.aside>
    </motion.div>
  )
}

function MatrixRowCells({ row }: { row: WorldSummaryView['rows'][number] }) {
  return (
    <>
      <div className={styles.rowHead}>
        <span className={styles.rowName}>{row.name}</span>
        <span className={styles.rowSub}>{row.sub}</span>
      </div>
      {row.cells.map((cell) => (
        <div key={cell.eraId} className={[styles.cell, cell.items.length > 0 ? styles.cellFilled : styles.cellEmpty].join(' ')}>
          {cell.items.map((item) => (
            <Link key={item.id} href={item.href} className={[styles.item, styles[`item_${item.kind}`]].join(' ')}>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </>
  )
}
