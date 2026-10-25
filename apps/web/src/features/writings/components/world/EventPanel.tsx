'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { LineIcon } from '@/components/ui/Card'

import { deleteEventAction, moveEventAction, updateEventAction } from '../../timeline-actions'
import type { EventRecord } from '../../types'
import { plural } from '../../writing-utils'
import { displayName, eraLabel, linkOptions, placeOptions, romanOf } from '../../world-utils'

import panelStyles from './EntryPanel.module.css'
import styles from './World.module.css'
import { useDraft, useWorld } from './WorldContext'
import { PanelLayout } from './WorldSidePanel'

// El panel de un evento (EscritosLinea.dc.html): qué pasa, quién participa, dónde, notas sueltas, causas y
// consecuencias. "Editar" vuelve editable el título, la descripción, la era, los vínculos y su lugar en la era.
export function EventPanel({ id, startEditing }: { id: string; startEditing: boolean }) {
  const { bundle, base, close, run } = useWorld()
  const [editing, setEditing] = useState(startEditing)
  const event = bundle.events.find((item) => item.id === id)
  const eraIndex = event ? bundle.eras.findIndex((era) => era.id === event.eraId) : -1

  if (!event || eraIndex === -1) {
    return (
      <PanelLayout kicker="Evento">
        <p className={styles.muted}>Este evento ya no existe.</p>
      </PanelLayout>
    )
  }

  return (
    <PanelLayout
      kicker={`Evento · Era ${romanOf(eraIndex)} · ${bundle.eras[eraIndex]!.shortName || bundle.eras[eraIndex]!.name}`}
      footer={
        <>
          <button type="button" className={panelStyles.primary} onClick={() => setEditing((value) => !value)}>
            {editing ? 'Listo' : 'Editar'}
          </button>
          {editing ? (
            <button
              type="button"
              className={[styles.ghost, styles.ghostDanger, panelStyles.pushRight].join(' ')}
              onClick={() => run(() => deleteEventAction(event.id), { success: `Se borró "${event.title}"`, onDone: close })}
            >
              Borrar evento
            </button>
          ) : (
            <Link href={`${base}/evento/${event.id}`} className={panelStyles.soft} onClick={close}>
              Abrir página
            </Link>
          )}
        </>
      }
    >
      <EventBody event={event} editing={editing} titleId="world-panel-title" />
    </PanelLayout>
  )
}

// El contenido de un evento: lo comparten el panel y la página completa del evento.
export function EventBody({ event, editing, titleId, layout = 'panel' }: { event: EventRecord; editing: boolean; titleId: string; layout?: 'panel' | 'page' }) {
  const { bundle, index, go, run } = useWorld()
  const eraIndex = bundle.eras.findIndex((era) => era.id === event.eraId)
  const era = bundle.eras[eraIndex]
  const inEra = bundle.events.filter((item) => item.eraId === event.eraId)
  const position = inEra.findIndex((item) => item.id === event.id)

  const save = (patch: Parameters<typeof updateEventAction>[1]) => run(() => updateEventAction(event.id, patch))
  const title = useDraft(event.title, (next) => next && save({ title: next }))
  const description = useDraft(event.description, (next) => save({ description: next }))

  const links = (ids: string[]) => ids.filter((id) => index.has(id))
  const who = links(event.who)
  const where = links(event.where)

  const head = (
    <>
      {era ? <span className={[styles.tag, panelStyles.eraTag].join(' ')}>{eraLabel(era, eraIndex)}</span> : null}
      <h2 id={titleId} className={layout === 'page' ? panelStyles.pageTitle : panelStyles.name}>
        {event.title || 'Evento nuevo'}
      </h2>
    </>
  )

  const chips = (ids: string[], field: 'who' | 'where') =>
    ids.map((id) => (
      <button
        key={id}
        type="button"
        className={styles.chip}
        aria-label={editing ? `Quitar ${displayName(index.get(id)!)}` : undefined}
        onClick={() => (editing ? save({ [field]: ids.filter((item) => item !== id) }) : go({ kind: 'entry', id }))}
      >
        {displayName(index.get(id)!)}
        {editing ? <LineIcon d="M6 6l12 12M18 6L6 18" size={12} strokeWidth={2.2} /> : null}
      </button>
    ))

  return (
    <>
      {editing ? (
        <div className={styles.stack}>
          {head}
          <label className={styles.field}>
            Título
            <input className={styles.input} type="text" value={title.value} maxLength={120} onChange={(changed) => title.onChange(changed.target.value)} onBlur={title.commit} />
          </label>
          <label className={styles.field}>
            Qué pasa
            <textarea className={[styles.input, styles.textarea].join(' ')} value={description.value} maxLength={3000} placeholder="Una o dos líneas" onChange={(changed) => description.onChange(changed.target.value)} onBlur={description.commit} />
          </label>
          <label className={styles.field}>
            Era
            <select className={styles.input} value={event.eraId} onChange={(changed) => save({ eraId: changed.target.value })}>
              {bundle.eras.map((item, itemIndex) => (
                <option key={item.id} value={item.id}>
                  {eraLabel(item, itemIndex)}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.fsec}>
            <h3 className={styles.fsecTitle}>Quién participa</h3>
            <span className={styles.chips}>
              {chips(who, 'who')}
              <select className={styles.linkSelect} value="" aria-label="Enlazar a quién participa" onChange={(changed) => changed.target.value && save({ who: [...who, changed.target.value] })}>
                <option value="">+ Enlazar…</option>
                {linkOptions(bundle, null)
                  .filter((option) => !who.includes(option.id))
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </span>
          </div>
          <div className={styles.fsec}>
            <h3 className={styles.fsecTitle}>Dónde pasa</h3>
            <span className={styles.chips}>
              {chips(where, 'where')}
              <select className={styles.linkSelect} value="" aria-label="Enlazar dónde pasa" onChange={(changed) => changed.target.value && save({ where: [...where, changed.target.value] })}>
                <option value="">+ Enlazar…</option>
                {placeOptions(bundle)
                  .filter((option) => !where.includes(option.id))
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </span>
          </div>
          <div className={styles.row}>
            <span className={[styles.hint, styles.spacer].join(' ')}>Posición en la era</span>
            <button type="button" className={styles.iconButton} disabled={position <= 0} aria-label="Subir evento" onClick={() => run(() => moveEventAction(event.id, 'up'))}>
              <LineIcon d="M12 19V5M6 11l6-6 6 6" size={16} strokeWidth={2} />
            </button>
            <span>
              {position + 1} de {inEra.length}
            </span>
            <button type="button" className={styles.iconButton} disabled={position === inEra.length - 1} aria-label="Bajar evento" onClick={() => run(() => moveEventAction(event.id, 'down'))}>
              <LineIcon d="M12 5v14M6 13l6 6 6-6" size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.stack}>
            {head}
            <p className={panelStyles.summary}>{event.description || 'Sin descripción todavía.'}</p>
          </div>
          <div className={styles.drows}>
            <div className={styles.drow}>
              <span className={styles.drowLabel}>Quién participa</span>
              {who.length ? <span className={styles.chips}>{chips(who, 'who')}</span> : <span className={styles.subtle}>Sin enlazar</span>}
            </div>
            <div className={styles.drow}>
              <span className={styles.drowLabel}>Dónde pasa</span>
              {where.length ? <span className={styles.chips}>{chips(where, 'where')}</span> : <span className={styles.subtle}>Sin enlazar</span>}
            </div>
          </div>
        </>
      )}
      <EventNotes event={event} editing={editing} />
      <div className={styles.fsec}>
        <h3 className={styles.fsecTitle}>Para rellenar</h3>
        <EventFill title="Causas" hint="¿Qué lo provocó?" text={event.causes} editing={editing} onSave={(text) => save({ causes: text })} />
        <EventFill title="Consecuencias" hint="¿Qué cambió después?" text={event.consequences} editing={editing} onSave={(text) => save({ consequences: text })} />
      </div>
    </>
  )
}

// Las notas sueltas de un evento (post-its): se agregan siempre, se quitan en modo editar.
function EventNotes({ event, editing }: { event: EventRecord; editing: boolean }) {
  const { run } = useWorld()
  const [text, setText] = useState('')
  function submit(submitted: FormEvent) {
    submitted.preventDefault()
    const clean = text.trim()
    if (!clean) return
    run(() => updateEventAction(event.id, { notes: [...event.notes, clean.slice(0, 500)] }), { onDone: () => setText('') })
  }
  return (
    <div className={styles.fsec}>
      <h3 className={styles.fsecTitle}>Notas del evento · {event.notes.length ? plural(event.notes.length, 'nota', 'notas') : 'Sin notas'}</h3>
      {event.notes.map((note, noteIndex) => (
        <div key={`${noteIndex}-${note}`} className={styles.enote}>
          <span className={styles.spacer}>{note}</span>
          {editing ? (
            <button
              type="button"
              className={[styles.iconButton, styles.iconButtonDanger].join(' ')}
              aria-label={`Borrar nota ${noteIndex + 1}`}
              onClick={() => run(() => updateEventAction(event.id, { notes: event.notes.filter((_, itemIndex) => itemIndex !== noteIndex) }))}
            >
              <LineIcon d="M6 6l12 12M18 6L6 18" size={16} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      ))}
      {event.notes.length === 0 ? <p className={styles.hint}>Agrega todas las que quieras: ideas sueltas, diálogos, dudas.</p> : null}
      <form className={styles.addForm} onSubmit={submit} noValidate>
        <label className={styles.field}>
          Nueva nota
          <input className={styles.input} type="text" value={text} maxLength={500} placeholder="Una idea sobre este evento" onChange={(changed) => setText(changed.target.value)} />
        </label>
        <button type="submit" className={styles.ghost}>
          Agregar
        </button>
      </form>
    </div>
  )
}

function EventFill({ title, hint, text, editing, onSave }: { title: string; hint: string; text: string; editing: boolean; onSave: (text: string) => void }) {
  const draft = useDraft(text, onSave)
  return (
    <div className={[styles.fill, !text && !editing ? styles.fillEmpty : null].filter(Boolean).join(' ')}>
      <span className={styles.fillTitle}>{title}</span>
      {editing ? (
        <textarea className={[styles.input, styles.textarea].join(' ')} value={draft.value} maxLength={3000} placeholder={hint} aria-label={title} onChange={(changed) => draft.onChange(changed.target.value)} onBlur={draft.commit} />
      ) : text ? (
        <p className={styles.fillText}>{text}</p>
      ) : (
        <p className={styles.fillHint}>{hint}</p>
      )}
    </div>
  )
}
