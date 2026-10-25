'use client'

import { MAX_FIELD_OPTIONS, MAX_TEMPLATE_FIELDS, NOTE_TEMPLATE_FIELD_TYPES, OPTION_TONES, type NoteTemplateFieldType } from '@kairo/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { LineIcon } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

import { deleteTemplateAction, updateTemplateAction } from '../../world-actions'
import type { FieldKind, TemplateField } from '../../types'
import { NOTE_TEMPLATE_FIELD_TYPE_LABEL } from '../../writing-meta'
import { plural } from '../../writing-utils'
import { sectionEntries } from '../../world-utils'
import colors from '../WritingColors.module.css'

import panelStyles from './EntryPanel.module.css'
import styles from './TemplatePanel.module.css'
import worldStyles from './World.module.css'
import { useDraft, useWorld } from './WorldContext'
import { PanelLayout } from './WorldSidePanel'

// El editor de una plantilla (EscritosPlantilla.dc.html, decisión #45): su nombre, sus campos "de vista corta" y sus
// secciones "para rellenar". Cada cambio guarda la plantilla completa (la API la recibe entera); el id de un campo
// no cambia nunca, así renombrar "Cuánto vive" no pierde lo que ya escribiste en cada especie.
export function TemplatePanel({ id, backEntryId }: { id: string; backEntryId: string | null }) {
  const { bundle, index, base, open, close, run } = useWorld()
  const toast = useToast()
  const router = useRouter()
  const template = bundle.templates.find((item) => item.id === id)
  const name = useDraft(template?.name ?? '', (next) => next && run(() => updateTemplateAction(id, { name: next.slice(0, 40) })))

  if (!template) {
    return (
      <PanelLayout kicker="Plantilla">
        <p className={worldStyles.muted}>Esta plantilla ya no existe.</p>
      </PanelLayout>
    )
  }

  const used = template.key === 'character' ? bundle.characters.length : sectionEntries(bundle, template.id).filter((entry) => entry.kind === 'note').length
  const back = backEntryId && index.has(backEntryId) ? { label: index.get(backEntryId)!.name, onClick: () => open({ kind: 'entry', id: backEntryId, edit: true }) } : null
  const fields = template.fields

  const save = (next: TemplateField[]) => run(() => updateTemplateAction(template.id, { fields: next }))

  // Un campo nuevo va al final de su grupo: los de vista corta juntos y las secciones al final.
  function add(kind: FieldKind) {
    if (fields.length >= MAX_TEMPLATE_FIELDS) return toast.show({ message: `Una plantilla lleva hasta ${MAX_TEMPLATE_FIELDS} campos.`, icon: 'info' })
    const field: TemplateField = { id: crypto.randomUUID(), kind, key: null, name: kind === 'field' ? 'Campo nuevo' : 'Sección nueva', type: 'text', hint: '', options: [] }
    const firstSection = fields.findIndex((item) => item.kind === 'section')
    const at = kind === 'section' || firstSection === -1 ? fields.length : firstSection
    save([...fields.slice(0, at), field, ...fields.slice(at)])
  }

  function update(fieldId: string, patch: Partial<TemplateField>) {
    save(fields.map((item) => (item.id === fieldId ? { ...item, ...patch } : item)))
  }

  // Sube un campo un lugar dentro de su grupo.
  function moveUp(field: TemplateField) {
    const group = fields.filter((item) => item.kind === field.kind)
    const at = group.findIndex((item) => item.id === field.id)
    if (at <= 0) return
    const reordered = [...group]
    ;[reordered[at - 1], reordered[at]] = [reordered[at]!, reordered[at - 1]!]
    const others = fields.filter((item) => item.kind !== field.kind)
    save(field.kind === 'field' ? [...reordered, ...others] : [...others, ...reordered])
  }

  // Quitar un campo no borra lo escrito en las fichas, pero ya no se ve: el aviso trae "Deshacer" (vuelve la
  // plantilla como estaba, con el mismo id, y lo escrito reaparece).
  function remove(field: TemplateField) {
    const previous = fields
    run(() => updateTemplateAction(template!.id, { fields: fields.filter((item) => item.id !== field.id) }), {
      onDone: () => toast.show({ message: `Se quitó "${field.name || 'el campo'}"`, icon: 'trash', onUndo: () => save(previous) }),
    })
  }

  function deleteSection() {
    run(() => deleteTemplateAction(template!.id), {
      success: `Se borró la sección "${template!.name}"`,
      onDone: () => {
        close()
        router.push(base)
      },
    })
  }

  return (
    <PanelLayout
      kicker="Plantilla"
      back={back}
      footer={
        <>
          <button type="button" className={panelStyles.primary} onClick={() => (back ? back.onClick() : close())}>
            Listo
          </button>
          {!template.key ? (
            <button type="button" className={[worldStyles.ghost, worldStyles.ghostDanger, panelStyles.pushRight].join(' ')} onClick={deleteSection}>
              Borrar sección
            </button>
          ) : null}
        </>
      }
    >
      <div className={styles.head}>
        <label htmlFor="world-panel-title" className={worldStyles.field}>
          Nombre de la plantilla
        </label>
        <input id="world-panel-title" className={styles.nameInput} type="text" value={name.value} maxLength={40} onChange={(event) => name.onChange(event.target.value)} onBlur={name.commit} />
        <p className={styles.used}>
          Se usa en {plural(used, template.key === 'character' ? 'personaje' : 'nota', template.key === 'character' ? 'personajes' : 'notas')}. Cambiarla no borra lo que ya escribiste.
        </p>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Vista corta</h3>
        <span className={styles.sectionHint}>Lo que sale arriba y en la tarjeta. Cortito.</span>
        {fields
          .filter((field) => field.kind === 'field')
          .map((field, position) => (
            <FieldRow key={field.id} field={field} first={position === 0} onUpdate={(patch) => update(field.id, patch)} onMoveUp={() => moveUp(field)} onRemove={() => remove(field)} />
          ))}
        <button type="button" className={worldStyles.ghost} onClick={() => add('field')}>
          + Agregar campo
        </button>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Para rellenar</h3>
        <span className={styles.sectionHint}>Secciones de abajo, con una pregunta que te guía. Las vacías se ven tenues.</span>
        {fields
          .filter((field) => field.kind === 'section')
          .map((field, position) => (
            <SectionRow key={field.id} field={field} first={position === 0} onUpdate={(patch) => update(field.id, patch)} onMoveUp={() => moveUp(field)} onRemove={() => remove(field)} />
          ))}
        <button type="button" className={worldStyles.ghost} onClick={() => add('section')}>
          + Agregar sección
        </button>
      </section>
    </PanelLayout>
  )
}

type RowProps = { field: TemplateField; first: boolean; onUpdate: (patch: Partial<TemplateField>) => void; onMoveUp: () => void; onRemove: () => void }

// Una fila de "Vista corta": nombre + tipo + subir + quitar; si es de selección, sus opciones debajo.
function FieldRow({ field, first, onUpdate, onMoveUp, onRemove }: RowProps) {
  const name = useDraft(field.name, (next) => onUpdate({ name: next.slice(0, 40) }))
  return (
    <div className={styles.fieldBlock}>
      <div className={styles.row}>
        <input className={styles.rowInput} type="text" value={name.value} maxLength={40} aria-label={`Nombre del campo ${field.name}`} onChange={(event) => name.onChange(event.target.value)} onBlur={name.commit} />
        <select className={styles.rowSelect} value={field.type} aria-label={`Tipo del campo ${field.name}`} onChange={(event) => onUpdate({ type: event.target.value as NoteTemplateFieldType })}>
          {NOTE_TEMPLATE_FIELD_TYPES.map((type) => (
            <option key={type} value={type}>
              {NOTE_TEMPLATE_FIELD_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
        <RowActions field={field} first={first} onMoveUp={onMoveUp} onRemove={onRemove} />
      </div>
      {field.type === 'select' ? <OptionsEditor field={field} onUpdate={onUpdate} /> : null}
    </div>
  )
}

// Una fila de "Para rellenar": nombre + pregunta guía opcional + subir + quitar.
function SectionRow({ field, first, onUpdate, onMoveUp, onRemove }: RowProps) {
  const name = useDraft(field.name, (next) => onUpdate({ name: next.slice(0, 40) }))
  const hint = useDraft(field.hint, (next) => onUpdate({ hint: next.slice(0, 120) }))
  return (
    <div className={styles.sectionRow}>
      <div className={styles.row}>
        <input className={styles.rowInputWide} type="text" value={name.value} maxLength={40} aria-label={`Nombre de la sección ${field.name}`} onChange={(event) => name.onChange(event.target.value)} onBlur={name.commit} />
        <RowActions field={field} first={first} onMoveUp={onMoveUp} onRemove={onRemove} />
      </div>
      <input className={styles.hintInput} type="text" value={hint.value} maxLength={120} placeholder="Pregunta guía (opcional)" aria-label={`Pregunta guía de ${field.name}`} onChange={(event) => hint.onChange(event.target.value)} onBlur={hint.commit} />
    </div>
  )
}

function RowActions({ field, first, onMoveUp, onRemove }: Omit<RowProps, 'onUpdate'>) {
  return (
    <span className={styles.rowActions}>
      <button type="button" className={worldStyles.iconButton} disabled={first} aria-label={`Subir ${field.name}`} onClick={onMoveUp}>
        <LineIcon d="M12 19V5M6 11l6-6 6 6" size={16} strokeWidth={2} />
      </button>
      <button type="button" className={[worldStyles.iconButton, worldStyles.iconButtonDanger].join(' ')} aria-label={`Quitar ${field.name}`} onClick={onRemove}>
        <LineIcon d="M6 6l12 12M18 6L6 18" size={16} strokeWidth={2} />
      </button>
    </span>
  )
}

// Las opciones de un campo de selección ("Región", "Reino"…): se quitan con la ✕ y se agregan escribiendo. Ojo con
// Región y Reino de "Tipo de lugar": la app las reconoce por su id, y si se quitan, Regiones ya no las encuentra.
function OptionsEditor({ field, onUpdate }: { field: TemplateField; onUpdate: (patch: Partial<TemplateField>) => void }) {
  const [label, setLabel] = useState('')
  function addOption() {
    const clean = label.trim().slice(0, 40)
    if (!clean || field.options.length >= MAX_FIELD_OPTIONS) return
    const tone = OPTION_TONES[field.options.length % OPTION_TONES.length]!
    onUpdate({ options: [...field.options, { id: crypto.randomUUID(), label: clean, tone }] })
    setLabel('')
  }
  return (
    <div className={styles.options}>
      {field.options.map((option) => (
        <button key={option.id} type="button" className={[styles.optionChip, colors[`tone_${option.tone}`]].join(' ')} aria-label={`Quitar la opción ${option.label}`} onClick={() => onUpdate({ options: field.options.filter((item) => item.id !== option.id) })}>
          {option.label}
          <LineIcon d="M6 6l12 12M18 6L6 18" size={11} strokeWidth={2.4} />
        </button>
      ))}
      <input
        className={styles.optionInput}
        type="text"
        value={label}
        maxLength={40}
        placeholder="+ Opción"
        aria-label={`Agregar una opción a ${field.name}`}
        onChange={(event) => setLabel(event.target.value)}
        onBlur={addOption}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            addOption()
          }
        }}
      />
    </div>
  )
}

