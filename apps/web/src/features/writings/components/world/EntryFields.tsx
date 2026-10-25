'use client'

import type { FieldValue } from '@kairo/shared'
import { useState, type FormEvent } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { formatDayMonth, type IsoDate } from '@/lib/dates'

import { updateEntryAction } from '../../entry-actions'
import type { Entry, EntryExtra, NoteTemplate, TemplateField } from '../../types'
import { displayName, eraLabel, linkOptions } from '../../world-utils'
import colors from '../WritingColors.module.css'

import styles from './World.module.css'
import { useDraft, useWorld } from './WorldContext'

// Los campos de una ficha (EscritosPersonaje, EscritosEspecie, EscritosRegion): la "Vista corta" (cada campo con su
// tipo) y "Para rellenar" (las secciones de la plantilla y las propias de esta ficha). Cada campo se guarda solo al
// salir de él o al elegir; solo viaja lo que cambió, así dos pestañas abiertas no se pisan. Los usan el panel y la
// página completa.

type FieldsProps = { entry: Entry; template: NoteTemplate | null; editing: boolean; single?: boolean }

const isFilled = (value: FieldValue | undefined) => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)

export function ShortFields({ entry, template, editing, single = false }: FieldsProps) {
  const fields = template?.fields.filter((field) => field.kind === 'field') ?? []
  if (fields.length === 0) return null
  return (
    <div className={styles.fsec}>
      <h3 className={styles.fsecTitle}>Vista corta</h3>
      <div className={[styles.drows, single ? styles.drowsOne : null].filter(Boolean).join(' ')}>
        {fields.map((field) => (
          <div key={field.id} className={styles.drow}>
            <span className={styles.drowLabel}>{field.name || 'Campo nuevo'}</span>
            {editing ? <FieldInput entry={entry} field={field} /> : <FieldValueView field={field} value={entry.values[field.id]} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// Cómo se lee el valor de un campo: los vínculos como chips que se pican, la era con su número, la fecha escrita.
function FieldValueView({ field, value }: { field: TemplateField; value: FieldValue | undefined }) {
  const { bundle, index, go } = useWorld()
  if (!isFilled(value)) return <span className={styles.subtle}>Sin llenar</span>

  if (field.type === 'link' && Array.isArray(value)) {
    const found = value.flatMap((id) => (index.has(id) ? [index.get(id)!] : []))
    if (found.length === 0) return <span className={styles.subtle}>Sin llenar</span>
    return (
      <span className={styles.chips}>
        {found.map((linked) => (
          <button key={linked.id} type="button" className={styles.chip} onClick={() => go({ kind: 'entry', id: linked.id })}>
            {displayName(linked)}
          </button>
        ))}
      </span>
    )
  }
  if (field.type === 'era') {
    const position = bundle.eras.findIndex((era) => era.id === value)
    return <span>{position >= 0 ? eraLabel(bundle.eras[position]!, position) : 'Sin llenar'}</span>
  }
  if (field.type === 'select') {
    const option = field.options.find((item) => item.id === value)
    return option ? <span className={[styles.tag, colors[`tone_${option.tone}`]].join(' ')}>{option.label}</span> : <span className={styles.subtle}>Sin llenar</span>
  }
  if (field.type === 'date' && typeof value === 'string') return <span>{`${formatDayMonth(value as IsoDate)} de ${value.slice(0, 4)}`}</span>
  return <span className={styles.valueText}>{String(value)}</span>
}

// El campo para editar, según su tipo.
function FieldInput({ entry, field }: { entry: Entry; field: TemplateField }) {
  const { bundle, index, run } = useWorld()
  const value = entry.values[field.id]
  const save = (next: FieldValue) => run(() => updateEntryAction(entry.kind, entry.id, { values: { [field.id]: next } }))

  if (field.type === 'link') {
    const ids = Array.isArray(value) ? value.filter((id) => index.has(id)) : []
    const options = linkOptions(bundle, entry.id).filter((option) => !ids.includes(option.id))
    return (
      <span className={styles.chips}>
        {ids.map((id) => (
          <button key={id} type="button" className={styles.chip} aria-label={`Quitar ${displayName(index.get(id)!)}`} onClick={() => save(ids.filter((item) => item !== id))}>
            {displayName(index.get(id)!)}
            <LineIcon d="M6 6l12 12M18 6L6 18" size={12} strokeWidth={2.2} />
          </button>
        ))}
        <select className={styles.linkSelect} value="" aria-label={`Enlazar ${field.name}`} onChange={(event) => event.target.value && save([...ids, event.target.value])}>
          <option value="">+ Enlazar…</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    )
  }
  if (field.type === 'era') {
    return (
      <select className={[styles.input, styles.inputSm].join(' ')} value={typeof value === 'string' ? value : ''} aria-label={field.name} onChange={(event) => save(event.target.value || null)}>
        <option value="">Sin era</option>
        {bundle.eras.map((era, position) => (
          <option key={era.id} value={era.id}>
            {eraLabel(era, position)}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'select') {
    return (
      <select className={[styles.input, styles.inputSm].join(' ')} value={typeof value === 'string' ? value : ''} aria-label={field.name} onChange={(event) => save(event.target.value || null)}>
        <option value="">Sin elegir</option>
        {field.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'date') {
    return <input className={[styles.input, styles.inputSm].join(' ')} type="date" value={typeof value === 'string' ? value : ''} aria-label={field.name} onChange={(event) => save(event.target.value || null)} />
  }
  return <TextFieldInput entry={entry} field={field} />
}

// Texto o número: se guarda al salir del campo.
function TextFieldInput({ entry, field }: { entry: Entry; field: TemplateField }) {
  const { run } = useWorld()
  const value = entry.values[field.id]
  const draft = useDraft(value === null || value === undefined ? '' : String(value), (next) => {
    const parsed: FieldValue = field.type === 'number' ? (next === '' ? null : Number(next.replace(',', '.'))) : next || null
    if (field.type === 'number' && typeof parsed === 'number' && !Number.isFinite(parsed)) return
    run(() => updateEntryAction(entry.kind, entry.id, { values: { [field.id]: parsed } }))
  })
  return (
    <input
      className={[styles.input, styles.inputSm].join(' ')}
      type="text"
      inputMode={field.type === 'number' ? 'decimal' : undefined}
      value={draft.value}
      aria-label={field.name}
      onChange={(event) => draft.onChange(event.target.value)}
      onBlur={draft.commit}
    />
  )
}

// --- Para rellenar ----------------------------------------------------------------------------------

export function FillSections({ entry, template, editing }: FieldsProps) {
  const sections = template?.fields.filter((field) => field.kind === 'section') ?? []
  if (sections.length === 0 && entry.extras.length === 0 && !editing) return null
  return (
    <div className={styles.fsec}>
      <h3 className={styles.fsecTitle}>Para rellenar</h3>
      {sections.map((field) => (
        <SectionBox key={field.id} title={field.name || 'Sección nueva'} hint={field.hint} text={typeof entry.values[field.id] === 'string' ? (entry.values[field.id] as string) : ''} editing={editing} onSave={(text) => updateEntryAction(entry.kind, entry.id, { values: { [field.id]: text || null } })} />
      ))}
      {entry.extras.map((extra) => (
        <SectionBox
          key={extra.id}
          title={extra.title}
          hint="Una sección solo de esta ficha"
          text={extra.text}
          editing={editing}
          onSave={(text) => updateEntryAction(entry.kind, entry.id, { extras: entry.extras.map((item) => (item.id === extra.id ? { ...item, text } : item)) })}
          onRemove={() => updateEntryAction(entry.kind, entry.id, { extras: entry.extras.filter((item) => item.id !== extra.id) })}
        />
      ))}
      {editing ? <AddExtra entry={entry} /> : null}
    </div>
  )
}

type SectionBoxProps = {
  title: string
  hint: string
  text: string
  editing: boolean
  onSave: (text: string) => ReturnType<typeof updateEntryAction>
  onRemove?: () => ReturnType<typeof updateEntryAction>
}

// Una sección: su texto, o la pregunta guía en gris si está vacía (las vacías se ven tenues, punteadas).
function SectionBox({ title, hint, text, editing, onSave, onRemove }: SectionBoxProps) {
  const { run } = useWorld()
  const draft = useDraft(text, (next) => run(() => onSave(next)))
  return (
    <div className={[styles.fill, !text && !editing ? styles.fillEmpty : null].filter(Boolean).join(' ')}>
      <span className={styles.row}>
        <span className={[styles.fillTitle, styles.spacer].join(' ')}>{title}</span>
        {editing && onRemove ? (
          <button type="button" className={[styles.iconButton, styles.iconButtonDanger].join(' ')} aria-label={`Quitar la sección ${title}`} onClick={() => run(onRemove)}>
            <LineIcon d="M6 6l12 12M18 6L6 18" size={16} strokeWidth={2} />
          </button>
        ) : null}
      </span>
      {editing ? (
        <textarea className={[styles.input, styles.textarea].join(' ')} value={draft.value} placeholder={hint || 'Escribe lo que quieras aquí'} aria-label={title} onChange={(event) => draft.onChange(event.target.value)} onBlur={draft.commit} />
      ) : text ? (
        <p className={styles.fillText}>{text}</p>
      ) : (
        <p className={styles.fillHint}>{hint || 'Escribe lo que quieras aquí'}</p>
      )}
    </div>
  )
}

// "Otra sección solo para esta nota" (EscritosPersonaje, modo editar).
function AddExtra({ entry }: { entry: Entry }) {
  const { run } = useWorld()
  const [title, setTitle] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    const clean = title.trim()
    if (!clean) return
    const extra: EntryExtra = { id: crypto.randomUUID(), title: clean.slice(0, 60), text: '' }
    run(() => updateEntryAction(entry.kind, entry.id, { extras: [...entry.extras, extra] }), { onDone: () => setTitle('') })
  }
  return (
    <form className={styles.addForm} onSubmit={submit} noValidate>
      <label className={styles.field}>
        Otra sección solo para esta ficha
        <input className={styles.input} type="text" value={title} maxLength={60} placeholder="Ej. Profecías" onChange={(event) => setTitle(event.target.value)} />
      </label>
      <button type="submit" className={styles.ghost}>
        Agregar
      </button>
    </form>
  )
}
