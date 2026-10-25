'use client'

import { LineIcon } from '@/components/ui/Card'

import { deleteEraAction, moveEraAction, updateEraAction } from '../../timeline-actions'
import { plural } from '../../writing-utils'
import { romanOf } from '../../world-utils'

import panelStyles from './EntryPanel.module.css'
import styles from './World.module.css'
import { useDraft, useWorld } from './WorldContext'
import { PanelLayout } from './WorldSidePanel'

// El panel de una era (Escritos.dc.html, `d.isEra`): su nombre, el corto (el de la tabla del Resumen), su resumen y
// tu nota, y en qué lugar va de la línea del tiempo. Cada campo se guarda al salir de él.
export function EraPanel({ id }: { id: string }) {
  const { bundle, close, run } = useWorld()
  const position = bundle.eras.findIndex((era) => era.id === id)
  const era = bundle.eras[position]

  const name = useDraft(era?.name ?? '', (next) => next && run(() => updateEraAction(id, { name: next })))
  const shortName = useDraft(era?.shortName ?? '', (next) => run(() => updateEraAction(id, { shortName: next })))
  const summary = useDraft(era?.summary ?? '', (next) => run(() => updateEraAction(id, { summary: next })))
  const note = useDraft(era?.note ?? '', (next) => run(() => updateEraAction(id, { note: next })))

  if (!era) {
    return (
      <PanelLayout kicker="Línea del tiempo">
        <p className={styles.muted}>Esta era ya no existe.</p>
      </PanelLayout>
    )
  }

  const events = bundle.events.filter((event) => event.eraId === era.id).length

  return (
    <PanelLayout
      kicker={`Línea del tiempo · Era ${romanOf(position)}`}
      footer={
        <>
          <button type="button" className={panelStyles.primary} onClick={close}>
            Listo
          </button>
          <button
            type="button"
            className={[styles.ghost, styles.ghostDanger, panelStyles.pushRight].join(' ')}
            onClick={() => run(() => deleteEraAction(era.id), { success: events ? `Se borró la era con ${plural(events, 'evento', 'eventos')}` : 'Se borró la era', onDone: close })}
          >
            Borrar era
          </button>
        </>
      }
    >
      <h2 id="world-panel-title" className={panelStyles.name}>
        Era {romanOf(position)}
      </h2>
      <label className={styles.field}>
        Nombre
        <input className={styles.input} type="text" value={name.value} maxLength={80} onChange={(event) => name.onChange(event.target.value)} onBlur={name.commit} />
      </label>
      <label className={styles.field}>
        Nombre corto (para la tabla del resumen)
        <input className={styles.input} type="text" value={shortName.value} maxLength={30} onChange={(event) => shortName.onChange(event.target.value)} onBlur={shortName.commit} />
      </label>
      <label className={styles.field}>
        Resumen
        <textarea
          className={[styles.input, styles.textarea].join(' ')}
          value={summary.value}
          maxLength={1000}
          placeholder="Qué pasa en esta era, en dos o tres líneas"
          onChange={(event) => summary.onChange(event.target.value)}
          onBlur={summary.commit}
        />
      </label>
      <label className={styles.field}>
        Tu nota
        <input className={styles.input} type="text" value={note.value} maxLength={1000} placeholder="Algo que quieras recordar de esta era" onChange={(event) => note.onChange(event.target.value)} onBlur={note.commit} />
      </label>
      <div className={styles.row}>
        <span className={[styles.hint, styles.spacer].join(' ')}>Orden en la línea del tiempo</span>
        <button type="button" className={styles.iconButton} disabled={position === 0} aria-label="Mover antes" onClick={() => run(() => moveEraAction(era.id, 'up'))}>
          <LineIcon d="M19 12H5M11 6l-6 6 6 6" size={16} strokeWidth={2} />
        </button>
        <span>
          {position + 1} de {bundle.eras.length}
        </span>
        <button type="button" className={styles.iconButton} disabled={position === bundle.eras.length - 1} aria-label="Mover después" onClick={() => run(() => moveEraAction(era.id, 'down'))}>
          <LineIcon d="M5 12h14M13 6l6 6-6 6" size={16} strokeWidth={2} />
        </button>
      </div>
      <p className={styles.hint}>{events ? `${plural(events, 'evento', 'eventos')}. Para editarlos, pícale a cada uno en la línea del tiempo.` : 'Todavía sin eventos.'}</p>
    </PanelLayout>
  )
}
