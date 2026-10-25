'use client'

import type { TiptapDoc } from '@kairo/shared'
import { EditorContent, useEditor, type Editor, type Range } from '@tiptap/react'
import { useRef, useState, type KeyboardEvent } from 'react'

import { Skeleton } from '@/components/ui/Skeleton'

import { buildExtensions, filterSlashItems, insertSimpleBlock, type SlashController, type SlashItem } from './extensions'
import { ImageDialog, type ImageDialogKind } from './ImageDialog'
import own from './BlockEditor.module.css'
import styles from './PageEditor.module.css'
import { SlashMenu } from './SlashMenu'

// Se guarda solo, este rato después de dejar de escribir (igual que una página).
const AUTOSAVE_MS = 900

type SlashView = { range: Range; query: string; top: number; left: number }

// ProseMirror guarda los atributos en objetos sin prototipo y una Server Action los descarta: pasar el contenido por
// JSON los vuelve objetos normales (mismo motivo que en PageEditor.tsx).
const plainDocOf = (editor: Editor): TiptapDoc => JSON.parse(JSON.stringify(editor.getJSON())) as TiptapDoc

// Los bloques sueltos de la página completa de una ficha (EscritosPaginaRegion, "Escribe aquí o / para insertar"):
// el mismo editor de Tiptap que una página de Escritos, con su menú "/", sin la barra de formato. `onSave` recibe el
// contenido unos instantes después de dejar de escribir (y al salir del editor).
export function BlockEditor({ content, onSave, label }: { content: TiptapDoc | null; onSave: (doc: TiptapDoc) => void; label: string }) {
  const [slash, setSlash] = useState<SlashView | null>(null)
  const [slashIndex, setSlashIndex] = useState(0)
  const [imageDialog, setImageDialog] = useState<ImageDialogKind | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [controller] = useState<SlashController>(() => ({
    onChange: (state) => {
      setSlashIndex(0)
      if (!state) {
        setSlash(null)
        return
      }
      const box = wrapRef.current?.getBoundingClientRect()
      const rect = state.rect
      setSlash({
        range: state.range,
        query: state.query,
        top: box && rect ? rect.bottom - box.top + 6 : 40,
        left: box && rect ? Math.max(0, Math.min(rect.left - box.left, box.width - 300)) : 0,
      })
    },
    onKey: () => false,
  }))
  const [extensions] = useState(() => buildExtensions(controller))

  const flush = (editor: Editor) => {
    if (!timer.current) return
    clearTimeout(timer.current)
    timer.current = undefined
    onSave(plainDocOf(editor))
  }

  const editor = useEditor({
    extensions,
    content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false,
    editorProps: { attributes: { 'aria-label': label, 'aria-multiline': 'true' } },
    onUpdate: ({ editor: updated }) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = undefined
        onSave(plainDocOf(updated))
      }, AUTOSAVE_MS)
    },
    onBlur: ({ editor: blurred }) => flush(blurred),
  })

  const items: SlashItem[] = slash ? filterSlashItems(slash.query) : []
  const selected = Math.min(slashIndex, Math.max(0, items.length - 1))

  function pick(item: SlashItem) {
    if (!editor || !slash) return
    if (item.id === 'image' || item.id === 'gallery') {
      editor.chain().focus().deleteRange(slash.range).run()
      setImageDialog(item.id)
      return
    }
    insertSimpleBlock(editor, slash.range, item.id)
  }

  function handleKeyCapture(event: KeyboardEvent) {
    if (!slash || items.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      setSlashIndex((selected + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      event.stopPropagation()
      pick(items[selected]!)
    }
  }

  function insertImages(kind: ImageDialogKind, sources: string[], caption: string) {
    if (!editor) return
    const images = sources.map((src) => ({ type: 'image', attrs: { src, alt: caption || null, title: caption || null } }))
    editor
      .chain()
      .focus()
      .insertContent(kind === 'gallery' ? { type: 'gallery', content: images } : images[0])
      .run()
  }

  return (
    <div ref={wrapRef} className={own.wrap} onKeyDownCapture={handleKeyCapture}>
      {editor ? (
        <EditorContent editor={editor} className={styles.content} />
      ) : (
        <div className={styles.skeleton} aria-hidden="true">
          <Skeleton width="80%" height={16} />
          <Skeleton width="60%" height={16} />
        </div>
      )}
      {slash ? <SlashMenu items={items} selected={selected} top={slash.top} left={slash.left} onPick={pick} /> : null}
      <ImageDialog kind={imageDialog} onClose={() => setImageDialog(null)} onInsert={insertImages} />
    </div>
  )
}
