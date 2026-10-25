'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { LineIcon } from '@/components/ui/Card'

import { confirmEntryUploadAction, createWorldNoteAction, deleteEntryAction, removeCharacterImageAction, signEntryUploadAction, updateEntryAction } from '../../entry-actions'
import type { Entry } from '../../types'
import { characterPlace, childrenOf, displayName, kingdomOf, kingdomTone, mentionsOf, placeTypeLabel, placesOf, sectionTemplates, templateOfEntry } from '../../world-utils'
import { Avatar } from '../Tone'
import colors from '../WritingColors.module.css'

import { FillSections, ShortFields } from './EntryFields'
import styles from './World.module.css'
import panelStyles from './EntryPanel.module.css'
import { useDraft, useWorld } from './WorldContext'
import { PanelLayout } from './WorldSidePanel'
import { useImageUpload } from './useImageUpload'

// El panel de una ficha (Escritos.dc.html, `d.isNote`): un personaje, una especie, un lugar o una nota de una sección
// extra. Se ve con su tipo, su resumen, la vista corta, lo que hay para rellenar, lo que tiene dentro (si es un
// lugar) y quién la menciona; "Editar" vuelve editable todo en el mismo panel, y "Abrir página" lleva a su página
// completa con portada y bloques.
export function EntryPanel({ id, startEditing }: { id: string; startEditing: boolean }) {
  const { bundle, index, base, open, close } = useWorld()
  const [editing, setEditing] = useState(startEditing)
  const entry = index.get(id)

  if (!entry) {
    return (
      <PanelLayout kicker="Ficha">
        <p className={styles.muted}>Esta ficha ya no existe (puede que la hayas borrado).</p>
      </PanelLayout>
    )
  }

  const template = templateOfEntry(bundle, entry)
  const parent = entry.kind === 'note' && entry.parentId ? index.get(entry.parentId) : undefined
  const isPlace = entry.kind === 'note' && placesOf(bundle).some((note) => note.id === entry.id)

  return (
    <PanelLayout
      kicker={kickerOf(entry)}
      back={parent ? { label: parent.name, onClick: () => open({ kind: 'entry', id: parent.id, edit: false }) } : null}
      footer={
        <>
          <button type="button" className={panelStyles.primary} onClick={() => setEditing((value) => !value)}>
            {editing ? 'Listo' : 'Editar'}
          </button>
          {editing ? (
            <>
              {template ? (
                <button type="button" className={styles.ghost} onClick={() => open({ kind: 'template', id: template.id, backEntryId: entry.id })}>
                  Editar plantilla de {template.name.toLowerCase()}
                </button>
              ) : null}
              <DeleteEntry entry={entry} onDeleted={close} />
            </>
          ) : (
            <>
              <Link href={`${base}/ficha/${entry.id}`} className={panelStyles.soft} onClick={close}>
                Abrir página
              </Link>
              {entry.url ? (
                <a className={panelStyles.external} href={entry.url} target="_blank" rel="noopener noreferrer">
                  Profundizar ↗
                </a>
              ) : null}
            </>
          )}
        </>
      }
    >
      <EntryHeader entry={entry} editing={editing} />
      <ShortFields entry={entry} template={template} editing={editing} />
      <FillSections entry={entry} template={template} editing={editing} />
      {entry.kind === 'character' && editing ? <AlsoIn entry={entry} /> : null}
      {editing ? <EntryExtras entry={entry} /> : null}
      {isPlace ? <PlaceKids entry={entry} /> : null}
      <Mentions entry={entry} />
    </PanelLayout>
  )

  // Lo que se lee arriba: "Personaje · Sudria · Protagonista", "Reino en Vadronia", "Especie · Vadronia".
  function kickerOf(item: Entry) {
    if (item.kind === 'character') return `Personaje · ${characterPlace(bundle, item)}`
    if (isPlace) return `${placeTypeLabel(bundle, item)}${parent ? ` en ${parent.name}` : ` de ${bundle.world.name}`}`
    return `${template?.name ?? 'Nota'} · ${bundle.world.name}`
  }
}

// La foto (personajes), el tipo, "En borrador" y el nombre; en modo editar, el nombre y el resumen.
function EntryHeader({ entry, editing }: { entry: Entry; editing: boolean }) {
  const { bundle, run } = useWorld()
  const template = templateOfEntry(bundle, entry)
  const name = useDraft(entry.name, (next) => next && run(() => updateEntryAction(entry.kind, entry.id, { name: next })))
  const summary = useDraft(entry.summary, (next) => run(() => updateEntryAction(entry.kind, entry.id, { summary: next })))
  const photo = useImageUpload({
    sign: (file) => signEntryUploadAction('character', entry.id, 'image', file),
    confirm: (path) => confirmEntryUploadAction('character', entry.id, 'image', path),
    success: 'Foto guardada.',
  })
  const kingdom = entry.kind === 'character' ? kingdomOf(bundle, entry) : null

  return (
    <>
      <div className={panelStyles.header}>
        {entry.kind === 'character' ? (
          <Avatar initial={displayName(entry).charAt(0)} tone={kingdomTone(bundle, kingdom?.id ?? null)} size={112} imageUrl={entry.imageUrl} square />
        ) : null}
        <div className={panelStyles.headerText}>
          <div className={styles.chips}>
            <span className={[styles.tag, colors[`tone_${template?.color ?? 'muted'}`]].join(' ')}>{template?.name ?? 'Nota'}</span>
            {entry.draft ? <span className={[styles.tag, styles.tagDraft].join(' ')}>En borrador</span> : null}
          </div>
          <h2 id="world-panel-title" className={panelStyles.name}>
            {entry.name}
          </h2>
          {entry.kind === 'character' && editing ? (
            <span className={styles.row}>
              <button type="button" className={styles.ghost} disabled={photo.uploading} onClick={photo.pick}>
                <LineIcon d={['M4 8h3l2-3h6l2 3h3v11H4z', 'M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z']} size={16} />
                {photo.uploading ? 'Subiendo…' : entry.imageUrl ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {entry.imageUrl ? (
                <button type="button" className={[styles.ghost, styles.ghostDanger].join(' ')} onClick={() => run(() => removeCharacterImageAction(entry.id))}>
                  Quitar foto
                </button>
              ) : null}
            </span>
          ) : null}
        </div>
      </div>
      {editing ? (
        <>
          <label className={styles.field}>
            Nombre
            <input className={styles.input} type="text" value={name.value} maxLength={80} onChange={(event) => name.onChange(event.target.value)} onBlur={name.commit} />
          </label>
          <label className={styles.field}>
            Resumen corto
            <textarea className={[styles.input, styles.textarea].join(' ')} value={summary.value} maxLength={2000} placeholder="Dos o tres líneas" onChange={(event) => summary.onChange(event.target.value)} onBlur={summary.commit} />
          </label>
        </>
      ) : (
        <p className={panelStyles.summary}>{entry.summary || 'Sin resumen todavía. Pícale a Editar para escribir dos o tres líneas.'}</p>
      )}
    </>
  )
}

// En borrador y el enlace para profundizar fuera de Kairo (Notion, un documento).
function EntryExtras({ entry }: { entry: Entry }) {
  const { run } = useWorld()
  const url = useDraft(entry.url ?? '', (next) => run(() => updateEntryAction(entry.kind, entry.id, { url: next || null })))
  return (
    <div className={styles.fsec}>
      <h3 className={styles.fsecTitle}>Más</h3>
      <label className={panelStyles.check}>
        <input type="checkbox" checked={entry.draft} onChange={(event) => run(() => updateEntryAction(entry.kind, entry.id, { draft: event.target.checked }))} />
        En borrador (todavía no es definitivo)
      </label>
      <label className={styles.field}>
        Enlace para profundizar (opcional)
        <input className={styles.input} type="url" value={url.value} placeholder="https://" onChange={(event) => url.onChange(event.target.value)} onBlur={url.commit} />
      </label>
    </div>
  )
}

// "También aparece en": las secciones extra donde se ve este personaje (la Luna en Deidades).
function AlsoIn({ entry }: { entry: Extract<Entry, { kind: 'character' }> }) {
  const { bundle, run } = useWorld()
  const sections = sectionTemplates(bundle)
  if (sections.length === 0) return null
  const save = (next: string[]) => run(() => updateEntryAction('character', entry.id, { sections: next }))
  return (
    <div className={styles.fsec}>
      <h3 className={styles.fsecTitle}>También aparece en</h3>
      <span className={styles.chips}>
        {sections
          .filter((section) => entry.sections.includes(section.id))
          .map((section) => (
            <button key={section.id} type="button" className={styles.chip} aria-label={`Quitar de ${section.name}`} onClick={() => save(entry.sections.filter((item) => item !== section.id))}>
              {section.name}
              <LineIcon d="M6 6l12 12M18 6L6 18" size={12} strokeWidth={2.2} />
            </button>
          ))}
        <select className={styles.linkSelect} value="" aria-label="Agregar a una sección" onChange={(event) => event.target.value && save([...entry.sections, event.target.value])}>
          <option value="">+ Sección…</option>
          {sections
            .filter((section) => !entry.sections.includes(section.id))
            .map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
        </select>
      </span>
    </div>
  )
}

// "Dentro de Vadronia": los lugares que tiene dentro y el formulario para agregar uno.
export function PlaceKids({ entry }: { entry: Entry }) {
  const { bundle, open, run } = useWorld()
  const [name, setName] = useState('')
  const kids = childrenOf(bundle, entry.id)
  const placeTemplate = bundle.templates.find((template) => template.key === 'place')

  function submit(event: FormEvent) {
    event.preventDefault()
    const clean = name.trim()
    if (!clean || !placeTemplate) return
    run(() => createWorldNoteAction(bundle.world.id, { templateId: placeTemplate.id, parentId: entry.id, name: clean }), { onDone: () => setName('') })
  }

  return (
    <div className={styles.fsec}>
      <h3 className={styles.fsecTitle}>Dentro de {entry.name}</h3>
      {kids.length > 0 ? (
        <div className={panelStyles.kids}>
          {kids.map((kid) => {
            const inside = childrenOf(bundle, kid.id).length
            return (
              <button key={kid.id} type="button" className={panelStyles.kid} onClick={() => open({ kind: 'entry', id: kid.id, edit: false })}>
                <span className={panelStyles.kidName}>{kid.name}</span>
                <span className={styles.hint}>
                  {placeTypeLabel(bundle, kid)}
                  {inside ? ` · ${inside} dentro` : ''}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className={styles.hint}>Nada adentro todavía. No hace falta: puede quedarse así.</p>
      )}
      <form className={styles.addForm} onSubmit={submit} noValidate>
        <label className={styles.field}>
          Agregar un lugar dentro
          <input className={styles.input} type="text" value={name} maxLength={80} placeholder="Ej. El castillo de la oscuridad" onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" className={styles.ghost}>
          Agregar
        </button>
      </form>
    </div>
  )
}

// "Lo mencionan": las fichas que la enlazan, los eventos donde sale y las historias. Se calcula, no se guarda.
export function Mentions({ entry }: { entry: Entry }) {
  const { bundle, go } = useWorld()
  const mentions = mentionsOf(bundle, entry.id)
  if (mentions.length === 0) return null
  return (
    <div className={styles.fsec}>
      <h3 className={styles.fsecTitle}>Lo mencionan</h3>
      <span className={styles.chips}>
        {mentions.map((mention) => (
          <button key={`${mention.target.kind}-${mention.id}`} type="button" className={[styles.chip, styles.chipNeutral].join(' ')} onClick={() => go(mention.target)}>
            {mention.label}
          </button>
        ))}
      </span>
    </div>
  )
}

// Borrar va a la papelera; un lugar se lleva lo que tiene dentro. El aviso trae "Deshacer".
function DeleteEntry({ entry, onDeleted }: { entry: Entry; onDeleted: () => void }) {
  const { bundle, run } = useWorld()
  const [confirming, setConfirming] = useState(false)
  const inside = entry.kind === 'note' ? childrenOf(bundle, entry.id).length : 0
  if (!confirming) {
    return (
      <button type="button" className={[styles.ghost, styles.ghostDanger, panelStyles.pushRight].join(' ')} onClick={() => setConfirming(true)}>
        Borrar
      </button>
    )
  }
  return (
    <span className={[styles.row, panelStyles.pushRight].join(' ')}>
      <span className={styles.hint}>{inside ? `¿Borrar con ${inside} ${inside === 1 ? 'lugar' : 'lugares'} dentro?` : '¿Borrar?'}</span>
      <button type="button" className={styles.ghost} onClick={() => setConfirming(false)}>
        No
      </button>
      <button
        type="button"
        className={panelStyles.danger}
        onClick={() => run(() => deleteEntryAction(entry.kind, entry.id), { success: `Se borró "${displayName(entry)}"`, onDone: onDeleted })}
      >
        Sí, borrar
      </button>
    </span>
  )
}
