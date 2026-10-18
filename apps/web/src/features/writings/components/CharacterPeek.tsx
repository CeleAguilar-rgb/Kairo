'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'

import { deleteCharacterAction, openCharacterPageAction, updateCharacterAction } from '../character-actions'
import { inputValue } from '../database-utils'
import type { CharacterField, CharacterRow } from '../types'
import { WRITING_ICON } from '../writing-meta'
import { undoWritingAction } from '../page-actions'

import { Chip } from './Tone'
import styles from './CharacterPeek.module.css'

type CharacterPeekProps = {
  // El personaje abierto, o null si el panel está cerrado.
  character: CharacterRow | null
  fields: CharacterField[]
  onClose: () => void
}

// El panel lateral de un personaje (BaseDatos.dc.html): su nombre, sus columnas, las historias donde aparece y su
// ficha. Todo se puede cambiar aquí mismo y se guarda al salir de cada campo. "Abrir como página" abre su ficha
// completa en el editor.
export function CharacterPeek({ character, fields, onClose }: CharacterPeekProps) {
  return (
    <Drawer open={character !== null} onClose={onClose} title={character ? character.name : 'Personaje'} hideTitle width="lg">
      {/* Aparte a propósito: Drawer lo desmonta al cerrarse, y la `key` hace que cada personaje empiece con sus datos. */}
      {character ? <PeekForm key={character.id} character={character} fields={fields} onClose={onClose} /> : null}
    </Drawer>
  )
}

function PeekForm({ character, fields, onClose }: { character: CharacterRow; fields: CharacterField[]; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const baseId = useId()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState(character.name)
  const [description, setDescription] = useState(character.description)
  // Lo que se escribe en cada columna (como texto del campo), por id de columna.
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.id, inputValue(field, character.values[field.id])])))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)

  // Manda al servidor lo que hay en el panel. Solo se llama al salir de un campo (o al elegir una fecha), no en cada tecla.
  function save(next: { name?: string; description?: string; drafts?: Record<string, string> } = {}) {
    const nextName = next.name ?? name
    const nextDrafts = next.drafts ?? drafts
    const values: Record<string, string | number | null> = {}
    for (const field of fields) {
      const text = (nextDrafts[field.id] ?? '').trim()
      // Un número también viaja como texto: el servidor lo convierte y avisa si no es un número.
      values[field.id] = text === '' ? null : text
    }
    startTransition(async () => {
      const result = await updateCharacterAction(character.id, { name: nextName, description: next.description ?? description, values })
      if (!result.ok) {
        setErrors(result.errors)
        if (result.message) toast.show({ message: result.message, icon: 'info' })
        return
      }
      setErrors({})
    })
  }

  function openAsPage() {
    startTransition(async () => {
      const result = await openCharacterPageAction(character.id)
      if (!result.ok || !result.id) {
        toast.show({ message: result.ok ? 'No se pudo abrir la ficha.' : (result.message ?? 'No se pudo abrir la ficha.'), icon: 'info' })
        return
      }
      router.push(`/escritos/paginas/${result.id}`)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCharacterAction(character.id)
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
        <button type="button" className={styles.asPage} onClick={openAsPage} disabled={pending}>
          <LineIcon d="M14 4h6v6M20 4l-8 8M10 6H4v14h14v-6" size={14} strokeWidth={2} />
          Abrir como página
        </button>
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
          className={[styles.name, errors.name ? styles.invalid : null].filter(Boolean).join(' ')}
          value={name}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
          onBlur={() => (name.trim() ? save() : setErrors({ name: 'Ponle un nombre.' }))}
        />
        {errors.name ? <span className={styles.error}>{errors.name}</span> : null}

        <div className={styles.props}>
          {fields.map((field) => (
            <div key={field.id} className={styles.prop}>
              <label htmlFor={`${baseId}-${field.id}`} className={styles.propName}>
                {field.name}
              </label>
              <div className={styles.propValue}>
                <FieldInput
                  id={`${baseId}-${field.id}`}
                  field={field}
                  value={drafts[field.id] ?? ''}
                  invalid={Boolean(errors[field.id])}
                  onChange={(value) => setDrafts((current) => ({ ...current, [field.id]: value }))}
                  // Una fecha se guarda al elegirla; lo demás, al salir del campo.
                  onCommit={(value) => save({ drafts: { ...drafts, [field.id]: value ?? drafts[field.id] ?? '' } })}
                />
                {errors[field.id] ? <span className={styles.error}>{errors[field.id]}</span> : null}
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
          <label htmlFor={`${baseId}-description`} className={styles.propName}>
            Contenido de la ficha
          </label>
          <textarea
            id={`${baseId}-description`}
            className={styles.description}
            value={description}
            rows={5}
            maxLength={2000}
            placeholder="Escribe aquí quién es: su historia, cómo es, qué quiere. Para algo más largo, ábrela como página."
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => save()}
          />
        </div>

        {confirming ? (
          <div className={styles.confirm} role="alertdialog" aria-labelledby={`${baseId}-confirm`}>
            <span id={`${baseId}-confirm`} className={styles.confirmText}>
              ¿Borrar a {character.name}? Va a la papelera y se quita de las historias donde aparece.
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
  field: CharacterField
  value: string
  invalid: boolean
  onChange: (value: string) => void
  // Pide guardar. `value` viene cuando el valor nuevo todavía no está en el estado (una fecha recién elegida).
  onCommit: (value?: string) => void
}

// El campo de una columna según su tipo. La selección es un texto con sugerencias (las opciones que ya existen): si se
// escribe una que no existe, se crea.
function FieldInput({ id, field, value, invalid, onChange, onCommit }: FieldInputProps) {
  const listId = `${id}-options`
  const className = [styles.input, invalid ? styles.invalid : null].filter(Boolean).join(' ')

  if (field.type === 'date') {
    return (
      <input
        id={id}
        className={className}
        type="date"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          onCommit(event.target.value)
        }}
      />
    )
  }
  return (
    <>
      <input
        id={id}
        className={className}
        type="text"
        inputMode={field.type === 'number' ? 'decimal' : undefined}
        list={field.type === 'select' ? listId : undefined}
        value={value}
        maxLength={field.type === 'select' ? 40 : 80}
        autoComplete="off"
        placeholder="—"
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onCommit()}
      />
      {field.type === 'select' ? (
        <datalist id={listId}>
          {field.options.map((option) => (
            <option key={option.id} value={option.label} />
          ))}
        </datalist>
      ) : null}
    </>
  )
}
