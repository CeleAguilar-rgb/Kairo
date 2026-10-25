'use client'

import { NOTE_TEMPLATE_FIELD_TYPES, templateNameSchema, type NoteTemplateFieldType } from '@kairo/shared'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'

import { addTemplateFieldAction, moveTemplateFieldUpAction, removeTemplateFieldAction, renameTemplateAction, renameTemplateFieldAction, setTemplateFieldHintAction, setTemplateFieldTypeAction } from '../template-actions'
import type { NoteTemplate, TemplateField } from '../types'
import { NOTE_TEMPLATE_FIELD_TYPE_LABEL } from '../writing-meta'
import { undoWritingAction } from '../page-actions'

import styles from './TemplateEditorDrawer.module.css'

// El editor de una plantilla (EscritosPlantilla.dc.html, decisión #45): su nombre, sus campos "de vista corta"
// (salen arriba y en la tarjeta) y sus secciones "para rellenar" (con una pregunta guía). Cada fila se guarda
// sola, como el resto de Escritos; no hay un botón "Guardar" aparte, "Listo" solo cierra el cajón.
export function TemplateEditorDrawer({ open, onClose, template }: { open: boolean; onClose: () => void; template: NoteTemplate | null }) {
  return (
    <Drawer open={open} onClose={onClose} title="Editar plantilla" hideTitle width="lg">
      {/* Aparte a propósito: Drawer lo desmonta al cerrarse, así cada vez que se abre empieza limpio. */}
      {template ? <TemplateEditorForm template={template} onClose={onClose} /> : null}
    </Drawer>
  )
}

function TemplateEditorForm({ template, onClose }: { template: NoteTemplate; onClose: () => void }) {
  const toast = useToast()
  const [, startTransition] = useTransition()
  // El valor que se ve mientras se escribe; si el guardado falla, vuelve al de `template` (abajo en saveName).
  // No hace falta re-sincronizar cuando `template` cambia por fuera: la única otra razón por la que cambia es
  // que este mismo guardado tuvo éxito, y ahí ya coincide con lo que se escribió.
  const [name, setName] = useState(template.name)

  function saveName() {
    const parsed = templateNameSchema.safeParse(name)
    if (!parsed.success || parsed.data === template.name) {
      setName(template.name)
      return
    }
    startTransition(async () => {
      const result = await renameTemplateAction(template.id, parsed.data)
      if (!result.ok) {
        setName(template.name)
        toast.show({ message: result.message ?? 'No se pudo renombrar la plantilla.', icon: 'info' })
      }
    })
  }

  function addField(kind: TemplateField['kind']) {
    startTransition(async () => {
      const result = await addTemplateFieldAction(template.id, kind)
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo agregar.', icon: 'info' })
    })
  }

  function removeField(field: TemplateField) {
    startTransition(async () => {
      const result = await removeTemplateFieldAction(template.id, field.id)
      if (!result.ok) {
        toast.show({ message: result.message ?? 'No se pudo quitar.', icon: 'info' })
        return
      }
      const token = result.undoToken
      toast.show({ message: `Se quitó "${field.name}"`, icon: 'trash', onUndo: token ? () => void undoWritingAction(token) : undefined })
    })
  }

  const shortFields = template.fields.filter((field) => field.kind === 'field')
  const sections = template.fields.filter((field) => field.kind === 'section')

  return (
    <div className={styles.form}>
      <div className={styles.head}>
        <input
          id="tpl-name"
          className={styles.nameInput}
          type="text"
          value={name}
          maxLength={40}
          aria-label="Nombre de la plantilla"
          onChange={(event) => setName(event.target.value)}
          onBlur={saveName}
        />
        <p className={styles.used}>Cambiarla no borra lo que ya escribiste.</p>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Vista corta</h3>
        <span className={styles.sectionHint}>Lo que sale arriba y en la tarjeta. Cortito.</span>
        {shortFields.map((field, index) => (
          <FieldRow key={field.id} templateId={template.id} field={field} isFirst={index === 0} onRemove={() => removeField(field)} />
        ))}
        <Button variant="ghost" className={styles.addRow} onClick={() => addField('field')}>
          <LineIcon d="M12 5v14M5 12h14" size={14} strokeWidth={2.2} />
          Agregar campo
        </Button>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Para rellenar</h3>
        <span className={styles.sectionHint}>Secciones de abajo, con una pregunta que te guía. Las vacías se ven tenues.</span>
        {sections.map((field, index) => (
          <SectionRow key={field.id} templateId={template.id} field={field} isFirst={index === 0} onRemove={() => removeField(field)} />
        ))}
        <Button variant="ghost" className={styles.addRow} onClick={() => addField('section')}>
          <LineIcon d="M12 5v14M5 12h14" size={14} strokeWidth={2.2} />
          Agregar sección
        </Button>
      </section>

      <footer className={styles.foot}>
        <Button onClick={onClose}>Listo</Button>
      </footer>
    </div>
  )
}

// Una fila de "Vista corta": nombre + tipo (texto, vínculo, era, selección, número, fecha) + subir + quitar.
function FieldRow({ templateId, field, isFirst, onRemove }: { templateId: string; field: TemplateField; isFirst: boolean; onRemove: () => void }) {
  const toast = useToast()
  const [, startTransition] = useTransition()
  const [name, setName] = useState(field.name)

  function saveName() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === field.name) {
      setName(field.name)
      return
    }
    startTransition(async () => {
      const result = await renameTemplateFieldAction(templateId, field.id, trimmed)
      if (!result.ok) {
        setName(field.name)
        toast.show({ message: result.message ?? 'No se pudo renombrar.', icon: 'info' })
      }
    })
  }

  function changeType(type: NoteTemplateFieldType) {
    startTransition(async () => {
      const result = await setTemplateFieldTypeAction(templateId, field.id, type)
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo cambiar el tipo.', icon: 'info' })
    })
  }

  function moveUp() {
    startTransition(async () => {
      await moveTemplateFieldUpAction(templateId, field.id)
    })
  }

  return (
    <div className={styles.row}>
      <input className={styles.rowInput} type="text" value={name} aria-label={`Nombre del campo ${field.name}`} onChange={(event) => setName(event.target.value)} onBlur={saveName} />
      <select className={styles.rowSelect} value={field.type} aria-label={`Tipo del campo ${field.name}`} onChange={(event) => changeType(event.target.value as NoteTemplateFieldType)}>
        {NOTE_TEMPLATE_FIELD_TYPES.map((type) => (
          <option key={type} value={type}>
            {NOTE_TEMPLATE_FIELD_TYPE_LABEL[type]}
          </option>
        ))}
      </select>
      <span className={styles.rowActions}>
        <Button variant="ghost" iconOnly disabled={isFirst} aria-label={`Subir ${field.name}`} onClick={moveUp}>
          <LineIcon d="M12 19V5M6 11l6-6 6 6" size={16} strokeWidth={2} />
        </Button>
        <Button variant="ghost" iconOnly aria-label={`Quitar ${field.name}`} onClick={onRemove}>
          <LineIcon d="M6 6l12 12M18 6L6 18" size={16} strokeWidth={2} />
        </Button>
      </span>
    </div>
  )
}

// Una fila de "Para rellenar": nombre + pregunta guía opcional + subir + quitar.
function SectionRow({ templateId, field, isFirst, onRemove }: { templateId: string; field: TemplateField; isFirst: boolean; onRemove: () => void }) {
  const toast = useToast()
  const [, startTransition] = useTransition()
  const [name, setName] = useState(field.name)
  const [hint, setHint] = useState(field.hint)

  function saveName() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === field.name) {
      setName(field.name)
      return
    }
    startTransition(async () => {
      const result = await renameTemplateFieldAction(templateId, field.id, trimmed)
      if (!result.ok) {
        setName(field.name)
        toast.show({ message: result.message ?? 'No se pudo renombrar.', icon: 'info' })
      }
    })
  }

  function saveHint() {
    if (hint === field.hint) return
    startTransition(async () => {
      const result = await setTemplateFieldHintAction(templateId, field.id, hint)
      if (!result.ok) {
        setHint(field.hint)
        toast.show({ message: result.message ?? 'No se pudo guardar la pregunta.', icon: 'info' })
      }
    })
  }

  function moveUp() {
    startTransition(async () => {
      await moveTemplateFieldUpAction(templateId, field.id)
    })
  }

  return (
    <div className={styles.sectionRow}>
      <div className={styles.row}>
        <input className={styles.rowInputWide} type="text" value={name} aria-label={`Nombre de la sección ${field.name}`} onChange={(event) => setName(event.target.value)} onBlur={saveName} />
        <span className={styles.rowActions}>
          <Button variant="ghost" iconOnly disabled={isFirst} aria-label={`Subir ${field.name}`} onClick={moveUp}>
            <LineIcon d="M12 19V5M6 11l6-6 6 6" size={16} strokeWidth={2} />
          </Button>
          <Button variant="ghost" iconOnly aria-label={`Quitar ${field.name}`} onClick={onRemove}>
            <LineIcon d="M6 6l12 12M18 6L6 18" size={16} strokeWidth={2} />
          </Button>
        </span>
      </div>
      <input
        className={styles.hintInput}
        type="text"
        value={hint}
        placeholder="Pregunta guía (opcional)"
        aria-label={`Pregunta guía de ${field.name}`}
        onChange={(event) => setHint(event.target.value)}
        onBlur={saveHint}
      />
    </div>
  )
}
