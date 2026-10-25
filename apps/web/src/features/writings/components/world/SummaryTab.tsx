'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { useState, type CSSProperties } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { fadeUp, staggerList } from '@/lib/motion'

import { updateWorldAction } from '../../world-actions'
import type { WorldRule } from '../../types'
import { boxesOf, gapsOf, matrixOf, romanOf } from '../../world-utils'

import styles from './World.module.css'
import tab from './SummaryTab.module.css'
import { useDraft, useWorld } from './WorldContext'

// Mundo → Resumen (EscritosResumen.dc.html): la sinopsis, "Dónde y cuándo" (cada región en cada era), los huecos por
// llenar, las reglas del mundo y un recuadro por cada pestaña de la barra. Nada de esto se guarda calculado: sale
// del mundo que ya está cargado (decisión #38).
export function SummaryTab() {
  return (
    <motion.div className={tab.wrap} variants={staggerList(0.06)} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <Synopsis />
      </motion.div>
      <motion.div className={styles.split} variants={fadeUp}>
        <Matrix />
        <aside className={styles.side}>
          <Gaps />
          <Rules />
        </aside>
      </motion.div>
      <motion.div variants={fadeUp}>
        <Boxes />
      </motion.div>
    </motion.div>
  )
}

function Synopsis() {
  const { bundle, run } = useWorld()
  const [editing, setEditing] = useState(false)
  const draft = useDraft(bundle.world.synopsis, (next) => run(() => updateWorldAction(bundle.world.id, { synopsis: next })))
  return (
    <section className={styles.card} aria-labelledby="world-synopsis">
      <div className={styles.cardHead}>
        <div className={styles.cardTitleRow}>
          <span className={styles.iconBox}>
            <LineIcon d={['M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z', 'M8 7h6']} />
          </span>
          <h2 id="world-synopsis" className={styles.h2}>
            Sinopsis
          </h2>
        </div>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => {
            if (editing) draft.commit()
            setEditing((value) => !value)
          }}
        >
          {editing ? 'Listo' : 'Editar'}
        </button>
      </div>
      {editing ? (
        <textarea className={[styles.input, styles.textarea, tab.synopsisInput].join(' ')} value={draft.value} maxLength={4000} aria-label="Sinopsis" onChange={(event) => draft.onChange(event.target.value)} onBlur={draft.commit} />
      ) : bundle.world.synopsis ? (
        <p className={tab.synopsis}>{bundle.world.synopsis}</p>
      ) : (
        <p className={styles.fillHint}>De qué trata tu mundo, en unos párrafos. Pícale a Editar para escribirla.</p>
      )}
    </section>
  )
}

function Matrix() {
  const { bundle, base, go } = useWorld()
  const rows = matrixOf(bundle)
  return (
    <section className={[styles.card, styles.grow].join(' ')} aria-labelledby="world-matrix">
      <div className={styles.cardHead}>
        <div className={styles.cardTitleRow}>
          <span className={[styles.iconBox, styles.iconBoxSoft].join(' ')}>
            <LineIcon d={['M3 3h18v18H3z', 'M3 9h18M3 15h18M9 3v18M15 3v18']} />
          </span>
          <div className={tab.titleBlock}>
            <h2 id="world-matrix" className={styles.h2}>
              Dónde y cuándo
            </h2>
            <span className={styles.hint}>Cada región en cada era. Toca algo para abrirlo.</span>
          </div>
        </div>
        <div className={tab.legend}>
          <span className={tab.legendItem}>
            <span className={[tab.swatch, tab.swatchStory].join(' ')} />
            Historia
          </span>
          <span className={tab.legendItem}>
            <span className={[tab.swatch, tab.swatchLore].join(' ')} />
            Evento
          </span>
          <span className={tab.legendItem}>
            <span className={[tab.swatch, tab.swatchIdea].join(' ')} />
            Idea por escribir
          </span>
        </div>
      </div>
      {bundle.eras.length === 0 ? (
        <p className={styles.hint}>Cuando agregues eras en la línea del tiempo, aquí verás qué pasa en cada región en cada una.</p>
      ) : (
        <div className={tab.scroll}>
          <div className={tab.matrix} style={{ '--eras': bundle.eras.length } as CSSProperties}>
            <span />
            {bundle.eras.map((era, position) => (
              <Link key={era.id} href={`${base}/linea-del-tiempo?era=${era.id}`} className={tab.eraHead}>
                <span className={tab.eraNumber}>{romanOf(position)}</span>
                <span className={tab.eraShort}>{era.shortName || era.name}</span>
              </Link>
            ))}
            {rows.map((row) => (
              <MatrixRowView key={row.id} row={row} onOpen={go} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function MatrixRowView({ row, onOpen }: { row: ReturnType<typeof matrixOf>[number]; onOpen: ReturnType<typeof useWorld>['go'] }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <div className={tab.rowHead}>
        <span className={tab.rowName}>{row.name}</span>
        <span className={styles.hint}>{row.sub}</span>
      </div>
      {row.cells.map((cell) => {
        const visible = expanded ? cell.items : cell.items.slice(0, 3)
        return (
          <div key={cell.eraId} className={[tab.cell, cell.items.length ? tab.cellFull : tab.cellEmpty].join(' ')}>
            {visible.map((item) => (
              <button key={item.id} type="button" className={[tab.item, tab[`item_${item.kind}`]].join(' ')} onClick={() => onOpen(item.target)}>
                {item.label}
              </button>
            ))}
            {cell.items.length > visible.length ? (
              <button type="button" className={tab.moreItems} onClick={() => setExpanded(true)}>
                +{cell.items.length - visible.length} más
              </button>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

function Gaps() {
  const { bundle, go } = useWorld()
  const gaps = gapsOf(bundle)
  return (
    <section className={tab.gaps} aria-labelledby="world-gaps">
      <svg className={tab.gapsStar} width="44" height="44" viewBox="0 0 40 40" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 4c.8 8.4 4.2 12.6 15 15.6-10.6 1.6-14 5.6-15.4 16.2C18.4 25.4 14.6 21.4 5 20.2 14.8 17.4 18.8 13 20 4z" />
      </svg>
      <h2 id="world-gaps" className={styles.h2}>
        Huecos por llenar
      </h2>
      <span className={tab.gapsHint}>Sacados de lo que ya escribiste</span>
      {gaps.length === 0 ? <p className={styles.hint}>Nada pendiente por ahora.</p> : null}
      {gaps.map((gap) => {
        const body = (
          <>
            <span className={tab.gapBox} aria-hidden="true" />
            <span className={tab.gapText}>
              <span className={tab.gapTitle}>{gap.title}</span>
              <span className={styles.hint}>{gap.detail}</span>
            </span>
          </>
        )
        return gap.target ? (
          <button key={gap.id} type="button" className={[tab.gap, tab.gapButton].join(' ')} onClick={() => go(gap.target!)}>
            {body}
          </button>
        ) : (
          <div key={gap.id} className={tab.gap}>
            {body}
          </div>
        )
      })}
    </section>
  )
}

// Las reglas del mundo ("Magia Aurelun: fragmentos de luna…"): se leen y, con "Editar", se cambian, agregan o quitan.
function Rules() {
  const { bundle, run } = useWorld()
  const [editing, setEditing] = useState(false)
  const rules = bundle.world.rules
  const save = (next: WorldRule[]) => run(() => updateWorldAction(bundle.world.id, { rules: next }))

  return (
    <section className={styles.card} aria-labelledby="world-rules">
      <div className={styles.cardHead}>
        <div className={styles.cardTitleRow}>
          <span className={styles.iconBox}>
            <LineIcon d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
          </span>
          <h2 id="world-rules" className={styles.h2}>
            Reglas del mundo
          </h2>
        </div>
        <button type="button" className={styles.ghost} onClick={() => setEditing((value) => !value)}>
          {editing ? 'Listo' : 'Editar'}
        </button>
      </div>
      {!editing && rules.length === 0 ? <p className={styles.fillHint}>Cómo funciona la magia, qué no se puede hacer… lo que no debe contradecirse.</p> : null}
      {editing
        ? rules.map((rule) => <RuleEditor key={rule.id} rule={rule} onSave={(next) => save(rules.map((item) => (item.id === rule.id ? next : item)))} onRemove={() => save(rules.filter((item) => item.id !== rule.id))} />)
        : rules.map((rule) => (
            <p key={rule.id} className={tab.rule}>
              <strong className={tab.ruleTitle}>{rule.title}:</strong> {rule.text}
            </p>
          ))}
      {editing ? (
        <button type="button" className={styles.ghost} onClick={() => save([...rules, { id: crypto.randomUUID(), title: 'Regla nueva', text: '' }])}>
          + Agregar regla
        </button>
      ) : null}
    </section>
  )
}

function RuleEditor({ rule, onSave, onRemove }: { rule: WorldRule; onSave: (rule: WorldRule) => void; onRemove: () => void }) {
  const title = useDraft(rule.title, (next) => next && onSave({ ...rule, title: next }))
  const text = useDraft(rule.text, (next) => onSave({ ...rule, text: next }))
  return (
    <div className={tab.ruleEdit}>
      <div className={styles.row}>
        <input className={[styles.input, styles.inputSm, styles.spacer].join(' ')} type="text" value={title.value} maxLength={80} aria-label="Título de la regla" onChange={(event) => title.onChange(event.target.value)} onBlur={title.commit} />
        <button type="button" className={[styles.iconButton, styles.iconButtonDanger].join(' ')} aria-label={`Quitar la regla ${rule.title}`} onClick={onRemove}>
          <LineIcon d="M6 6l12 12M18 6L6 18" size={16} strokeWidth={2} />
        </button>
      </div>
      <textarea className={[styles.input, styles.textarea].join(' ')} value={text.value} maxLength={1000} aria-label={`Texto de ${rule.title}`} onChange={(event) => text.onChange(event.target.value)} onBlur={text.commit} />
    </div>
  )
}

function Boxes() {
  const { bundle, go } = useWorld()
  const boxes = boxesOf(bundle)
  if (boxes.length === 0) return null
  return (
    <div className={tab.boxes}>
      {boxes.map((box) => (
        <section key={box.tabId} className={styles.card} aria-label={box.title}>
          <div className={styles.cardHead}>
            <h2 className={tab.boxTitle}>{box.title}</h2>
            <Link href={box.href} className={tab.seeAll}>
              Ver todo ›
            </Link>
          </div>
          {box.groups.length === 0 ? <p className={styles.hint}>Nada todavía.</p> : null}
          {box.groups.map((group) => (
            <div key={group.label || 'all'} className={tab.boxGroup}>
              {group.label ? <span className={styles.hint}>{group.label}</span> : null}
              <div className={styles.chips}>
                {group.items.map((item) => (
                  <button key={item.id} type="button" className={[styles.chip, item.dashed ? styles.chipDashed : null].filter(Boolean).join(' ')} onClick={() => go(item.target)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
