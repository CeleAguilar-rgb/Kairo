'use client'

import Link from 'next/link'
import { useState } from 'react'

import { LineIcon } from '@/components/ui/Card'

import { updateEntryAction } from '../../entry-actions'
import type { Entry, WorldBundle } from '../../types'
import { characterPlace, displayName, kingdomOf, kingdomTone, placesOf, placeTypeLabel, romanOf, templateOfEntry } from '../../world-utils'
import { BlockEditor } from '../editor/BlockEditor'
import { Avatar } from '../Tone'
import colors from '../WritingColors.module.css'

import { EntryCover } from './EntryCover'
import { FillSections, ShortFields } from './EntryFields'
import { Mentions, PlaceKids } from './EntryPanel'
import { EventBody } from './EventPanel'
import page from './FullPages.module.css'
import styles from './World.module.css'
import { useDraft, useWorld, WorldProvider } from './WorldContext'
import { WorldSidePanel } from './WorldSidePanel'

// Las páginas completas de la wiki de un mundo (EscritosPaginaRegion, EscritosPaginaEspecie, EscritosPaginaEvento):
// una ficha o un evento a todo lo ancho, con su portada. Una ficha lleva sus secciones siempre editables y debajo
// los bloques sueltos (el editor de Escritos, con "/"); a un lado, su vista corta, lo que tiene dentro y quién la
// menciona. Viven fuera de las pestañas, pero con el mismo mundo: un vínculo se abre en el panel de la derecha.

export function EntryFullPage({ bundle, entry }: { bundle: WorldBundle; entry: Entry }) {
  return (
    <WorldProvider bundle={bundle}>
      <EntryPageBody initial={entry} />
      <WorldSidePanel />
    </WorldProvider>
  )
}

function EntryPageBody({ initial }: { initial: Entry }) {
  const { bundle, index, base, run } = useWorld()
  const [editing, setEditing] = useState(false)
  // Lo de la lista (nombre, valores…) se pone al día con cada guardado; el contenido de los bloques solo viene en
  // la ficha sola, que es `initial`.
  const listed = index.get(initial.id)
  const entry: Entry = listed ? ({ ...listed, content: initial.content } as Entry) : initial
  const template = templateOfEntry(bundle, entry)
  const parent = entry.kind === 'note' && entry.parentId ? index.get(entry.parentId) : undefined
  const isPlace = entry.kind === 'note' && placesOf(bundle).some((note) => note.id === entry.id)
  const name = useDraft(entry.name, (next) => next && run(() => updateEntryAction(entry.kind, entry.id, { name: next })))
  const summary = useDraft(entry.summary, (next) => run(() => updateEntryAction(entry.kind, entry.id, { summary: next })))

  const kicker =
    entry.kind === 'character' ? `Personaje · ${characterPlace(bundle, entry)}` : isPlace ? `${placeTypeLabel(bundle, entry)}${parent ? ` en ${parent.name}` : ` de ${bundle.world.name}`}` : `${template?.name ?? 'Nota'} · ${bundle.world.name}`
  const backHref = entry.kind === 'character' ? `${base}/personajes` : isPlace ? `${base}/regiones` : template?.key === 'species' ? `${base}/especies` : template ? `${base}/seccion/${template.id}` : base

  return (
    <div className={page.page}>
      <div className={page.top}>
        <Link href={backHref} className={styles.crumb}>
          <LineIcon d="M15 6l-6 6 6 6" size={16} strokeWidth={2} />
          {bundle.world.name}
        </Link>
        {parent ? (
          <>
            <span aria-hidden="true" className={styles.subtle}>
              /
            </span>
            <Link href={`${base}/ficha/${parent.id}`} className={styles.crumb}>
              {parent.name}
            </Link>
          </>
        ) : null}
        <span className={page.kicker}>{kicker}</span>
        {entry.url ? (
          <a className={page.soft} href={entry.url} target="_blank" rel="noopener noreferrer">
            Profundizar ↗
          </a>
        ) : null}
        <button type="button" className={page.primary} onClick={() => setEditing((value) => !value)}>
          {editing ? 'Listo' : 'Editar'}
        </button>
      </div>

      <div className={page.wrap}>
        <EntryCover entry={entry} editing={editing} />
        <div className={[page.grid, entry.cover.mode !== 'none' ? page.overlap : null].filter(Boolean).join(' ')}>
          <article className={page.paper} aria-labelledby="entry-title">
            <div className={page.head}>
              {entry.kind === 'character' ? (
                <Avatar initial={displayName(entry).charAt(0)} tone={kingdomTone(bundle, kingdomOf(bundle, entry)?.id ?? null)} size={76} imageUrl={entry.imageUrl} square />
              ) : (
                <span className={[page.tile, colors[`tone_${template?.color ?? 'muted'}`]].join(' ')}>{entry.name.charAt(0).toUpperCase()}</span>
              )}
              <div className={styles.chips}>
                <span className={[styles.tag, colors[`tone_${template?.color ?? 'muted'}`]].join(' ')}>{template?.name ?? 'Nota'}</span>
                {entry.draft ? <span className={[styles.tag, styles.tagDraft].join(' ')}>En borrador</span> : null}
              </div>
            </div>
            <label htmlFor="entry-title" className={styles.srOnly}>
              Nombre
            </label>
            <input id="entry-title" className={page.title} type="text" value={name.value} maxLength={80} onChange={(event) => name.onChange(event.target.value)} onBlur={name.commit} />
            <textarea className={page.summary} value={summary.value} maxLength={2000} placeholder="Un resumen corto, dos o tres líneas" aria-label="Resumen" onChange={(event) => summary.onChange(event.target.value)} onBlur={summary.commit} />

            <FillSections entry={entry} template={template} editing />

            <div className={styles.fsec}>
              <h3 className={styles.fsecTitle}>Más bloques</h3>
              <p className={styles.hint}>Escribe aquí o usa “/” para insertar títulos, casillas, citas o imágenes.</p>
              <BlockEditor content={entry.content ?? null} label={`Bloques de ${entry.name}`} onSave={(content) => run(() => updateEntryAction(entry.kind, entry.id, { content }))} />
            </div>
          </article>

          <aside className={page.side}>
            <section className={styles.card}>
              <ShortFields entry={entry} template={template} editing={editing} single />
            </section>
            {isPlace ? (
              <section className={styles.card}>
                <PlaceKids entry={entry} />
              </section>
            ) : null}
            <Mentions entry={entry} />
          </aside>
        </div>
      </div>
    </div>
  )
}

export function EventFullPage({ bundle, eventId }: { bundle: WorldBundle; eventId: string }) {
  return (
    <WorldProvider bundle={bundle}>
      <EventPageBody eventId={eventId} />
      <WorldSidePanel />
    </WorldProvider>
  )
}

function EventPageBody({ eventId }: { eventId: string }) {
  const { bundle, base } = useWorld()
  const [editing, setEditing] = useState(false)
  const event = bundle.events.find((item) => item.id === eventId)
  const eraIndex = event ? bundle.eras.findIndex((era) => era.id === event.eraId) : -1

  return (
    <div className={page.page}>
      <div className={page.top}>
        <Link href={event ? `${base}/linea-del-tiempo?era=${event.eraId}` : base} className={styles.crumb}>
          <LineIcon d="M15 6l-6 6 6 6" size={16} strokeWidth={2} />
          {bundle.world.name}
        </Link>
        <span className={page.kicker}>{event && eraIndex >= 0 ? `Evento · Era ${romanOf(eraIndex)} · ${bundle.eras[eraIndex]!.shortName || bundle.eras[eraIndex]!.name}` : 'Evento'}</span>
        {event ? (
          <button type="button" className={page.primary} onClick={() => setEditing((value) => !value)}>
            {editing ? 'Listo' : 'Editar'}
          </button>
        ) : null}
      </div>
      <div className={page.wrap}>
        {event ? (
          <div className={page.eventPaper}>
            <EventBody event={event} editing={editing} titleId="event-title" layout="page" />
          </div>
        ) : (
          <div className={[styles.empty, styles.emptyDashed].join(' ')}>Este evento ya no existe.</div>
        )}
      </div>
    </div>
  )
}
