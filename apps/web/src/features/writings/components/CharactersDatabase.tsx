'use client'

import { NOTE_TEMPLATE_FIELD_TYPES, type NoteTemplateFieldType } from '@kairo/shared'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { PageHeading } from '@/components/layout/PageHeading'
import { Button } from '@/components/ui/Button'
import { Card, LineIcon } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { fadeUp, staggerList } from '@/lib/motion'

import { createCharacterAction } from '../entry-actions'
import { updateTemplateAction } from '../world-actions'
import { displayValue, optionFor, subline } from '../database-utils'
import type { CharacterDbView, CharacterRow, TemplateField } from '../types'
import { FIELD_TYPE_ICON, NOTE_TEMPLATE_FIELD_TYPE_LABEL, WRITING_ICON } from '../writing-meta'
import { plural } from '../writing-utils'

import { CharacterPeek } from './CharacterPeek'
import styles from './CharactersDatabase.module.css'
import { Avatar, Chip } from './Tone'
import colors from './WritingColors.module.css'

type ViewMode = 'table' | 'gallery' | 'board'

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'table', label: 'Tabla' },
  { value: 'gallery', label: 'Galería' },
  { value: 'board', label: 'Tablero' },
]

// La base de datos de personajes (BaseDatos.dc.html): los personajes de un mundo en tabla, galería o tablero, con filtro
// por reino, propiedades que se agregan a mano y un panel lateral para ver y cambiar cada uno.
export function CharactersDatabase({ view }: { view: CharacterDbView }) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<ViewMode>('table')
  const [filter, setFilter] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(view.initialOpenId)
  const [menuOpen, setMenuOpen] = useState(false)

  const groupField = view.fields.find((field) => field.id === view.groupFieldId) ?? null
  const rows = view.rows.filter((row) => filter === 'all' || row.groupId === filter)
  const opened = view.rows.find((row) => row.id === openId) ?? null

  function addCharacter() {
    startTransition(async () => {
      const result = await createCharacterAction(view.worldId, { name: 'Personaje nuevo' })
      if (!result.ok || !result.id) {
        toast.show({ message: result.ok ? 'No se pudo crear al personaje.' : (result.message ?? 'No se pudo crear al personaje.'), icon: 'info' })
        return
      }
      setMode('table')
      setFilter('all')
      setOpenId(result.id)
    })
  }

  // Una propiedad nueva es un campo más de la plantilla Personaje del mundo (decisión #45): se ve también en la
  // ficha de cada personaje. La plantilla se guarda completa, con el campo al final de la vista corta.
  function addField(type: NoteTemplateFieldType) {
    setMenuOpen(false)
    const field: TemplateField = { id: crypto.randomUUID(), kind: 'field', key: null, name: NOTE_TEMPLATE_FIELD_TYPE_LABEL[type], type, hint: '', options: [] }
    const sections = view.allFields.filter((item) => item.kind === 'section')
    const shorts = view.allFields.filter((item) => item.kind === 'field')
    startTransition(async () => {
      const result = await updateTemplateAction(view.templateId, { fields: [...shorts, field, ...sections] })
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo agregar la propiedad.', icon: 'info' })
      else toast.show({ message: `Propiedad "${field.name}" agregada. Renómbrala o dale opciones desde la plantilla del mundo.`, icon: 'check' })
    })
  }

  // Quitar una columna la quita de la plantilla; lo escrito no se borra y "Deshacer" la devuelve igual que estaba.
  function removeField(field: TemplateField) {
    const previous = view.allFields
    startTransition(async () => {
      const result = await updateTemplateAction(view.templateId, { fields: previous.filter((item) => item.id !== field.id) })
      if (!result.ok) {
        toast.show({ message: result.message ?? 'No se pudo quitar la propiedad.', icon: 'info' })
        return
      }
      toast.show({ message: `Se quitó la propiedad "${field.name}"`, icon: 'trash', onUndo: () => void updateTemplateAction(view.templateId, { fields: previous }) })
    })
  }

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Ruta">
        <Link href="/escritos" className={styles.crumbLink}>
          Escritos
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/escritos/mundos/${view.worldId}`} className={styles.crumbLink}>
          {view.worldName}
        </Link>
        <span aria-hidden="true">/</span>
        <span className={styles.crumbHere} aria-current="page">
          Personajes
        </span>
      </nav>

      <header className={styles.header}>
        <PageHeading title="Personajes" squiggle={false}>
          <span className={styles.subtitle}>Base de datos · {plural(view.rows.length, 'personaje', 'personajes')}</span>
        </PageHeading>
        <Button onClick={addCharacter} disabled={pending}>
          <LineIcon d={WRITING_ICON.plus} size={16} strokeWidth={2} />
          Nuevo personaje
        </Button>
      </header>

      {view.worlds.length > 1 ? (
        <Segmented label="Mundo" value={view.worldId} onChange={(id) => router.replace(`/escritos/personajes/tabla?mundo=${id}`)} options={view.worlds.map((world) => ({ value: world.id, label: world.name }))} />
      ) : null}

      <motion.div variants={staggerList(0.08, 0.05)} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <Card as="section" className={styles.card} aria-label="Personajes">
            <div className={styles.toolbar}>
              <Segmented label="Vista" value={mode} onChange={setMode} options={VIEW_OPTIONS} />
              <span className={styles.spacer} />
              {groupField ? (
                <div className={styles.filters} role="group" aria-label={`Filtrar por ${groupField.name.toLowerCase()}`}>
                  {[{ id: 'all', label: 'Todos' }, ...groupField.options].map((option) => (
                    <button key={option.id} type="button" className={[styles.filter, filter === option.id ? styles.filterOn : null].filter(Boolean).join(' ')} aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div
                className={styles.menuWrap}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setMenuOpen(false)
                }}
              >
                <Button variant="ghost" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
                  <LineIcon d={WRITING_ICON.plus} size={14} strokeWidth={2.2} />
                  Propiedad
                </Button>
                {menuOpen ? (
                  <div className={styles.menu} role="menu">
                    <span className={styles.menuHint}>Tipo de propiedad</span>
                    {NOTE_TEMPLATE_FIELD_TYPES.map((type) => (
                      <button key={type} type="button" role="menuitem" className={styles.menuItem} onClick={() => addField(type)}>
                        <LineIcon d={FIELD_TYPE_ICON[type]} size={16} />
                        {NOTE_TEMPLATE_FIELD_TYPE_LABEL[type]}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {view.rows.length === 0 ? (
              <EmptyState id="characters-empty" title="Todavía no hay personajes" description="Cada personaje tiene su nombre, los campos de su plantilla y su ficha. Empieza con el primero." doodle="heart" />
            ) : rows.length === 0 ? (
              <p className={styles.none}>Nadie en este grupo todavía.</p>
            ) : mode === 'table' ? (
              <Table fields={view.fields} names={view.names} rows={rows} activeId={openId} onOpen={setOpenId} onRemoveField={removeField} />
            ) : mode === 'gallery' ? (
              <Gallery fields={view.fields} groupField={groupField} rows={rows} onOpen={setOpenId} />
            ) : (
              <Board fields={view.fields} groupField={groupField} rows={view.rows} filter={filter} onOpen={setOpenId} />
            )}

            {view.rows.length > 0 && mode === 'table' ? (
              <button type="button" className={styles.addRow} onClick={addCharacter} disabled={pending}>
                <LineIcon d={WRITING_ICON.plus} size={14} strokeWidth={2} />
                Nueva fila
              </button>
            ) : null}
          </Card>
        </motion.div>
      </motion.div>

      <CharacterPeek character={opened} view={view} onClose={() => setOpenId(null)} />
    </div>
  )
}

// El valor de una columna en la tabla: una etiqueta de color para las selecciones, texto para lo demás, "—" si está vacío.
function Cell({ field, row, names }: { field: TemplateField; row: CharacterRow; names: Record<string, string> }) {
  const option = optionFor(field, row.values[field.id])
  if (option) return <Chip tone={option.tone}>{option.label}</Chip>
  const text = displayValue(field, row.values[field.id], names)
  return <span className={text ? undefined : styles.hint}>{text || '—'}</span>
}

type TableProps = { fields: TemplateField[]; names: Record<string, string>; rows: CharacterRow[]; activeId: string | null; onOpen: (id: string) => void; onRemoveField: (field: TemplateField) => void }

function Table({ fields, names, rows, activeId, onOpen, onRemoveField }: TableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            {fields.map((field) => (
              <th key={field.id} scope="col">
                <span className={styles.columnHead}>
                  {field.name}
                  {!field.key ? (
                    <button type="button" className={styles.removeColumn} aria-label={`Quitar la propiedad ${field.name}`} onClick={() => onRemoveField(field)}>
                      <LineIcon d={WRITING_ICON.close} size={12} strokeWidth={2.4} />
                    </button>
                  ) : null}
                </span>
              </th>
            ))}
            <th scope="col">Historias</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={[styles.row, activeId === row.id ? styles.rowOn : null].filter(Boolean).join(' ')} onClick={() => onOpen(row.id)}>
              <td>
                <button type="button" className={styles.rowButton} onClick={(event) => { event.stopPropagation(); onOpen(row.id) }}>
                  {row.name}
                </button>
              </td>
              {fields.map((field) => (
                <td key={field.id}>
                  <Cell field={field} row={row} names={names} />
                </td>
              ))}
              <td>
                <span className={styles.hint}>{row.stories.join(', ') || '—'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type GalleryProps = { fields: TemplateField[]; groupField: TemplateField | null; rows: CharacterRow[]; onOpen: (id: string) => void }

function Gallery({ fields, groupField, rows, onOpen }: GalleryProps) {
  return (
    <div className={styles.gallery}>
      {rows.map((row) => {
        const option = groupField ? optionFor(groupField, row.groupId) : null
        const role = subline(row, fields)
        return (
          <button key={row.id} type="button" className={styles.galleryCard} onClick={() => onOpen(row.id)}>
            <span className={[styles.cover, colors[`tone_${row.tone}`]].join(' ')}>
              {row.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL firmada de corta duración, no un asset que next/image deba optimizar
                <img src={row.imageUrl} alt="" className={styles.coverImage} />
              ) : (
                row.initial
              )}
            </span>
            <span className={styles.galleryBody}>
              <span className={styles.galleryName}>{row.name}</span>
              <span className={styles.galleryChips}>
                {option ? <Chip tone={option.tone}>{option.label}</Chip> : null}
                {role ? <Chip tone="muted">{role}</Chip> : null}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

type BoardProps = { fields: TemplateField[]; groupField: TemplateField | null; rows: CharacterRow[]; filter: string; onOpen: (id: string) => void }

// El tablero: una columna por opción de la columna de grupo (Reino) y, si hay personajes sin grupo, una de "Sin …".
function Board({ fields, groupField, rows, filter, onOpen }: BoardProps) {
  if (!groupField) return <p className={styles.none}>Para ver el tablero hace falta una propiedad de tipo Selección.</p>
  const options = filter === 'all' ? groupField.options : groupField.options.filter((option) => option.id === filter)
  const unassigned = filter === 'all' ? rows.filter((row) => !optionFor(groupField, row.groupId)) : []
  const columns = [...options.map((option) => ({ id: option.id, label: option.label, tone: option.tone, rows: rows.filter((row) => row.groupId === option.id) })), ...(unassigned.length ? [{ id: 'none', label: `Sin ${groupField.name.toLowerCase()}`, tone: 'muted' as const, rows: unassigned }] : [])]

  return (
    <div className={styles.board}>
      {columns.map((column) => (
        <div key={column.id} className={styles.column}>
          <div className={styles.columnTop}>
            <Chip tone={column.tone}>{column.label}</Chip>
            <span className={styles.hint}>{column.rows.length}</span>
          </div>
          {column.rows.map((row) => (
            <button key={row.id} type="button" className={styles.boardCard} onClick={() => onOpen(row.id)}>
              <span className={styles.boardName}>
                <Avatar initial={row.initial} tone={row.tone} size={24} imageUrl={row.imageUrl} />
                {row.name}
              </span>
              {subline(row, fields) ? <span className={styles.hintSmall}>{subline(row, fields)}</span> : null}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
