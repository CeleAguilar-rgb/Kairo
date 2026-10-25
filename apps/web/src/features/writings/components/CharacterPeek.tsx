'use client'

import type { FieldValue } from '@kairo/shared'
import Link from 'next/link'
import { useId, useState, useTransition } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'

import { deleteEntryAction, updateEntryAction } from '../entry-actions'
import { undoWritingAction } from '../page-actions'
import type { CharacterDbView, CharacterRow, TemplateField } from '../types'
import { WRITING_ICON } from '../writing-meta'

import styles from './CharacterPeek.module.css'
import { Chip } from './Tone'

type CharacterPeekProps = {
  // El personaje abierto, o null si el panel está cerrado.
  character: CharacterRow | null
  view: CharacterDbView
  onClose: () => void
}

// El panel lateral de un personaje (BaseDatos.dc.html): su nombre, sus columnas (los campos de la plantilla
// Personaje), las historias donde aparece y su resumen. Todo se cambia aquí mismo y cada campo se guarda solo al
// salir de él (o al elegir). "Abrir como página" lleva a su página completa en el mundo.
export function CharacterPeek({ character, view, onClose }: CharacterPeekProps) {
  return (
    <Drawer open={character !== null} onClose={onClose} title={character ? character.name : 'Personaje'} hideTitle width="lg">
      {/* Aparte a propósito: Drawer lo desmonta al cerrarse, y la `key` hace que cada personaje empiece con sus datos. */}
      {character ? <PeekForm key={character.id} character={character} view={view} onClose={onClose} /> : null}
    </Drawer>
  )
}

function PeekForm({ character, view, onClose }: { character: CharacterRow; view: CharacterDbView; onClose: () => void }) {
  const toast = useToast()
  const baseId = useId()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(character.name)
  const [summary, setSummary] = useState(character.summary)
  const [confirming, setConfirming] = useState(false)

  // Solo viaja lo que cambió: un campo a la vez.
  function save(patch: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateEntryAction('character', character.id, patch)
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo guardar.', icon: 'info' })
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEntryAction('character', character.id)
      if (!result.ok) {
        setConfirming(false)
        toast.show({ message: result.message ?? 'No se pudo borrar al personaje.', icon: 'info' })
        return
      }
      const token = result.undoToken
      toast.show({ message: `Se borró a ${character.name}`, icon: 'trash', onUndo: token ? () => void undoWritingAction(token) : undefined })
      onClose()
    })
  }

  return (
    <div className={styles.peek}>
      <div className={styles.bar}>
        <Link href={`/escritos/mundos/${view.worldId}/ficha/${character.id}`} className={styles.asPage}>
          <LineIcon d="M14 4h6v6M20 4l-8 8M10 6H4v14h14v-6" size={14} strokeWidth={2} />
          Abrir como página
        </Link>
        <div className={styles.barActions}>
          <button type="button" className={[styles.icon, styles.iconDanger].join(' ')} aria-label="Borrar personaje" onClick={() => setConfirming(true)}>
            <LineIcon d={WRITING_ICON.trash} />
          </button>
          <button type="button" className={styles.icon} aria-label="Cerrar" onClick={onClose}>
            <LineIcon d={WRITING_ICON.close} size={20} />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <label htmlFor={`${baseId}-name`} className={styles.srOnly}>
          Nombre
        </label>
        <input
          id={`${baseId}-name`}
          className={[styles.name, !name.trim() ? styles.invalid : null].filter(Boolean).join(' ')}
          value={name}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== character.name) save({ name: name.trim() })
          }}
        />
        {!name.trim() ? <span className={styles.error}>Ponle un nombre.</span> : null}

        <div className={styles.props}>
          {view.fields.map((field) => (
            <div key={field.id} className={styles.prop}>
              <label htmlFor={`${baseId}-${field.id}`} className={styles.propName}>
                {field.name || 'Campo nuevo'}
              </label>
              <div className={styles.propValue}>
                <FieldInput id={`${baseId}-${field.id}`} selfId={character.id} field={field} value={character.values[field.id]} view={view} onSave={(value) => save({ values: { [field.id]: value } })} />
              </div>
            </div>
          ))}
          <div className={styles.prop}>
            <span className={styles.propName}>Historias</span>
            <span className={styles.stories}>
              {character.stories.length > 0
                ? character.stories.map((title) => (
                    <Chip key={title} tone="soft">
                      {title}
                    </Chip>
                  ))
                : '—'}
            </span>
          </div>
        </div>

        <div className={styles.sheet}>
          <label htmlFor={`${baseId}-summary`} className={styles.propName}>
            Resumen
          </label>
          <textarea
            id={`${baseId}-summary`}
            className={styles.description}
            value={summary}
            rows={5}
            maxLength={2000}
            placeholder="Quién es, en dos o tres líneas. Su ficha completa (qué quiere, a qué le teme…) está en su página."
            onChange={(event) => setSummary(event.target.value)}
            onBlur={() => {
              if (summary.trim() !== character.summary) save({ summary: summary.trim() })
            }}
          />
        </div>

        {confirming ? (
          <div className={styles.confirm} role="alertdialog" aria-labelledby={`${baseId}-confirm`}>
            <span id={`${baseId}-confirm`} className={styles.confirmText}>
              ¿Borrar a {character.name}? Va a la papelera 30 días.
            </span>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.ghost} onClick={() => setConfirming(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.danger} onClick={handleDelete} disabled={pending}>
                Borrar personaje
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

type FieldInputProps = {
  id: string
  selfId: string
  field: TemplateField
  value: FieldValue | undefined
  view: CharacterDbView
  onSave: (value: FieldValue) => void
}

// El campo de una columna según su tipo: texto o número (se guarda al salir), fecha, selección y era (al elegir) y
// vínculo (chips que se quitan y un "+ Enlazar…").
function FieldInput({ id, selfId, field, value, view, onSave }: FieldInputProps) {
  const [draft, setDraft] = useState(value === null || value === undefined || Array.isArray(value) ? '' : String(value))

  if (field.type === 'date') {
    return <input id={id} className={styles.input} type="date" value={typeof value === 'string' ? value : ''} onChange={(event) => onSave(event.target.value || null)} />
  }
  if (field.type === 'select' || field.type === 'era') {
    const options = field.type === 'select' ? field.options.map((option) => ({ id: option.id, label: option.label })) : view.eraOptions
    return (
      <select id={id} className={styles.input} value={typeof value === 'string' ? value : ''} onChange={(event) => onSave(event.target.value || null)}>
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'link') {
    const ids = Array.isArray(value) ? value.filter((item) => view.names[item]) : []
    return (
      <span className={styles.stories}>
        {ids.map((item) => (
          <button key={item} type="button" className={styles.linkChip} aria-label={`Quitar ${view.names[item]}`} onClick={() => onSave(ids.filter((other) => other !== item))}>
            <Chip tone="soft">{view.names[item]} ✕</Chip>
          </button>
        ))}
        <select id={id} className={styles.input} value="" onChange={(event) => event.target.value && onSave([...ids, event.target.value])}>
          <option value="">+ Enlazar…</option>
          {view.linkOptions
            .filter((option) => option.id !== selfId && !ids.includes(option.id))
            .map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
        </select>
      </span>
    )
  }
  return (
    <input
      id={id}
      className={styles.input}
      type="text"
      inputMode={field.type === 'number' ? 'decimal' : undefined}
      value={draft}
      maxLength={300}
      autoComplete="off"
      placeholder="—"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const clean = draft.trim()
        if (field.type === 'number') {
          const parsed = clean === '' ? null : Number(clean.replace(',', '.'))
          if (parsed !== null && !Number.isFinite(parsed)) return
          if (parsed !== (value ?? null)) onSave(parsed)
          return
        }
        if (clean !== (value ?? '')) onSave(clean || null)
      }}
    />
  )
}
