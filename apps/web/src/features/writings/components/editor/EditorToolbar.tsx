'use client'

import { useEditorState, type Editor } from '@tiptap/react'
import type { ReactNode } from 'react'

import { LineIcon } from '@/components/ui/Card'

import { WRITING_ICON } from '../../writing-meta'

import type { ImageDialogKind } from './ImageDialog'
import styles from './EditorToolbar.module.css'

type BlockKind = 'text' | 'h1' | 'h2' | 'h3' | 'quote'

const BLOCK_LABEL: Record<BlockKind, string> = { text: 'Texto', h1: 'Título grande', h2: 'Título', h3: 'Subtítulo', quote: 'Cita' }

type EditorToolbarProps = {
  editor: Editor | null
  onLink: () => void
  // Abre el menú con todos los bloques, debajo del botón "Insertar".
  onInsert: (anchor: HTMLElement) => void
  onImage: (kind: ImageDialogKind) => void
}

// Cambia el bloque donde está el cursor a otro tipo (texto, tres títulos o cita).
function setBlock(editor: Editor, kind: BlockKind) {
  const chain = editor.chain().focus()
  if (kind === 'text') chain.clearNodes().run()
  else if (kind === 'quote') chain.setBlockquote().run()
  else chain.setNode('heading', { level: kind === 'h1' ? 1 : kind === 'h2' ? 2 : 3 }).run()
}

// Lo que la barra necesita saber del cursor: qué bloque es, qué formatos tiene puestos y si se puede deshacer o rehacer.
function readState(current: Editor) {
  const block: BlockKind = current.isActive('heading', { level: 1 })
    ? 'h1'
    : current.isActive('heading', { level: 2 })
      ? 'h2'
      : current.isActive('heading', { level: 3 })
        ? 'h3'
        : current.isActive('blockquote')
          ? 'quote'
          : 'text'
  return {
    block,
    bold: current.isActive('bold'),
    italic: current.isActive('italic'),
    underline: current.isActive('underline'),
    strike: current.isActive('strike'),
    code: current.isActive('code'),
    link: current.isActive('link'),
    bullets: current.isActive('bulletList'),
    numbers: current.isActive('orderedList'),
    todo: current.isActive('taskList'),
    canUndo: current.can().undo(),
    canRedo: current.can().redo(),
  }
}

// La barra de formato sobre el contenido: el tipo de bloque, negrita, cursiva, subrayado, tachado, código y enlace, las
// listas (viñetas, numerada y casillas), imagen y galería, deshacer y rehacer, y "Insertar" con todos los bloques.
// El canvas solo trae el menú "/"; la barra hace lo mismo a la vista y le da formato al texto.
export function EditorToolbar({ editor, onLink, onInsert, onImage }: EditorToolbarProps) {
  // Se vuelve a pintar con cada cambio del cursor o del contenido, para que los botones sepan si están activos.
  // `useEditorState` no da nada hasta la primera transacción del editor (el primer toque o tecla), así que mientras tanto se
  // lee el estado directamente: si no, la barra aparecería apagada hasta tocar el texto.
  const live = useEditorState({ editor, selector: ({ editor: current }) => (current ? readState(current) : null) })
  const state = live ?? (editor ? readState(editor) : null)

  const disabled = !editor || !state

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formato del texto">
      <button
        type="button"
        className={styles.insert}
        aria-haspopup="listbox"
        data-insert-trigger
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => onInsert(event.currentTarget)}
      >
        <LineIcon d={WRITING_ICON.plus} size={14} strokeWidth={2.4} />
        Insertar
      </button>

      <select
        className={styles.block}
        aria-label="Tipo de bloque"
        disabled={disabled}
        value={state?.block ?? 'text'}
        onChange={(event) => editor && setBlock(editor, event.target.value as BlockKind)}
      >
        {(Object.keys(BLOCK_LABEL) as BlockKind[]).map((kind) => (
          <option key={kind} value={kind}>
            {BLOCK_LABEL[kind]}
          </option>
        ))}
      </select>

      <span className={styles.separator} aria-hidden="true" />

      <Tool label="Negrita (Ctrl+B)" active={state?.bold} disabled={disabled} onClick={() => editor?.chain().focus().toggleBold().run()}>
        <span className={styles.bold}>B</span>
      </Tool>
      <Tool label="Cursiva (Ctrl+I)" active={state?.italic} disabled={disabled} onClick={() => editor?.chain().focus().toggleItalic().run()}>
        <span className={styles.italic}>I</span>
      </Tool>
      <Tool label="Subrayado (Ctrl+U)" active={state?.underline} disabled={disabled} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
        <span className={styles.underline}>U</span>
      </Tool>
      <Tool label="Tachado" active={state?.strike} disabled={disabled} onClick={() => editor?.chain().focus().toggleStrike().run()}>
        <span className={styles.strike}>S</span>
      </Tool>
      <Tool label="Código" active={state?.code} disabled={disabled} onClick={() => editor?.chain().focus().toggleCode().run()}>
        <LineIcon d="M8 7l-5 5 5 5M16 7l5 5-5 5" size={16} strokeWidth={2} />
      </Tool>
      <Tool label="Enlace (Ctrl+K)" active={state?.link} disabled={disabled} onClick={onLink}>
        <LineIcon d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" size={16} strokeWidth={2} />
      </Tool>

      <span className={styles.separator} aria-hidden="true" />

      <Tool label="Lista con viñetas" active={state?.bullets} disabled={disabled} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
        <LineIcon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" size={16} strokeWidth={2.2} />
      </Tool>
      <Tool label="Lista numerada" active={state?.numbers} disabled={disabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
        <LineIcon d="M10 6h10M10 12h10M10 18h10M4 4.5l1.5-1V9M4 14.5h3L4 18h3" size={16} strokeWidth={2} />
      </Tool>
      <Tool label="Lista de casillas" active={state?.todo} disabled={disabled} onClick={() => editor?.chain().focus().toggleTaskList().run()}>
        <LineIcon d="M4 4h16v16H4zM8 12l3 3 5-6" size={16} strokeWidth={2} />
      </Tool>

      <span className={styles.separator} aria-hidden="true" />

      <Tool label="Insertar una imagen" disabled={disabled} onClick={() => onImage('image')}>
        <LineIcon d={WRITING_ICON.image} size={16} strokeWidth={2} />
      </Tool>
      <Tool label="Insertar una galería" disabled={disabled} onClick={() => onImage('gallery')}>
        <LineIcon d={WRITING_ICON.grid} size={16} strokeWidth={2} />
      </Tool>

      <span className={styles.separator} aria-hidden="true" />

      <Tool label="Deshacer (Ctrl+Z)" disabled={disabled || !state?.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
        <LineIcon d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" size={16} strokeWidth={2} />
      </Tool>
      <Tool label="Rehacer (Ctrl+Shift+Z)" disabled={disabled || !state?.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
        <LineIcon d="M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" size={16} strokeWidth={2} />
      </Tool>
    </div>
  )
}

type ToolProps = { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }

// Un botón de la barra. El mousedown no hace nada para que el clic no le quite el foco al editor (si no, el texto
// elegido se desmarcaría antes de aplicar el formato).
function Tool({ label, active = false, disabled = false, onClick, children }: ToolProps) {
  return (
    <button
      type="button"
      className={[styles.tool, active ? styles.toolOn : null].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
