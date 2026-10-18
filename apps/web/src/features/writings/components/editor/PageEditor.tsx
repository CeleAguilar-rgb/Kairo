'use client'

import { PAGE_STATUSES, tiptapWordCount, type PageStatus, type TiptapDoc } from '@kairo/shared'
import { EditorContent, useEditor, type Editor, type Range } from '@tiptap/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

import { deletePageAction, savePageAction, undoWritingAction } from '../../page-actions'
import { PAGE_STATUS_LABEL, type PageEditorView } from '../../types'
import { WRITING_ICON } from '../../writing-meta'
import { formatCount } from '../../writing-utils'
import { Avatar } from '../Tone'

import { EditorToolbar } from './EditorToolbar'
import { buildExtensions, filterSlashItems, insertSimpleBlock, SLASH_ITEMS, type SlashController, type SlashItem } from './extensions'
import { ImageDialog, type ImageDialogKind } from './ImageDialog'
import { LinkDialog } from './LinkDialog'
import styles from './PageEditor.module.css'
import { SlashMenu } from './SlashMenu'

// Se guarda solo, este rato después de dejar de escribir.
const AUTOSAVE_MS = 800

type SaveState = 'saved' | 'pending' | 'error'

type SlashView = { range: Range; query: string; top: number; left: number }

// Dónde se abre el menú de "Insertar" (debajo del botón), relativo a la página.
type InsertMenuView = { top: number; left: number }

// Una imagen pegada con una dirección que no sea https no se guarda (el esquema de `shared` la rechaza), así que
// no se deja entrar al pegar.
const stripUnsafeImages = (html: string) => html.replace(/<img\b[^>]*>/gi, (tag) => (/\bsrc=["'](https:\/\/|\/(?!\/))/i.test(tag) ? tag : ''))

const docOf = (editor: Editor) => editor.getJSON() as unknown as TiptapDoc

// El contenido para mandarlo al servidor. ProseMirror guarda los atributos de cada bloque en objetos sin prototipo
// (`Object.create(null)`), y al enviarlos a una Server Action React los descarta: el título de nivel 2 llegaría
// sin su `level` y la imagen sin su `src`. Pasarlos por JSON los vuelve objetos normales.
const plainDocOf = (editor: Editor): TiptapDoc => JSON.parse(JSON.stringify(editor.getJSON())) as TiptapDoc

// La página (Pagina.dc.html): la ruta de migas con el estado del guardado, la portada, el título, las propiedades y
// el contenido, que es un editor de bloques (Tiptap) con menú "/". Todo se guarda solo.
export function PageEditor({ view }: { view: PageEditorView }) {
  const router = useRouter()
  const toast = useToast()
  const [deleting, startDelete] = useTransition()

  const [title, setTitle] = useState(view.title)
  const [status, setStatus] = useState<PageStatus>(view.status)
  const [tag, setTag] = useState(view.tag ?? '')
  const [words, setWords] = useState(view.wordCount)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [savedText, setSavedText] = useState(view.savedText)

  const [slash, setSlash] = useState<SlashView | null>(null)
  const [slashIndex, setSlashIndex] = useState(0)
  const [imageDialog, setImageDialog] = useState<ImageDialogKind | null>(null)
  const [insertMenu, setInsertMenu] = useState<InsertMenuView | null>(null)
  // El enlace que ya tenía el texto elegido; null si el diálogo está cerrado.
  const [linkDialog, setLinkDialog] = useState<{ href: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [blockCount, setBlockCount] = useState(0)

  const paperRef = useRef<HTMLElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Lo último que se escribió en el título, el estado y la etiqueta: el guardado automático corre un rato después,
  // y no debe leer valores viejos.
  const latest = useRef({ title: view.title, status: view.status, tag: view.tag ?? '' })

  // Avisa a este componente dónde está el cursor cuando se escribe "/". Se crea una vez: el editor la guarda.
  const [controller] = useState<SlashController>(() => ({
    onChange: (state) => {
      setSlashIndex(0)
      if (!state) {
        setSlash(null)
        return
      }
      const paper = paperRef.current?.getBoundingClientRect()
      const rect = state.rect
      setSlash({
        range: state.range,
        query: state.query,
        top: paper && rect ? rect.bottom - paper.top + 6 : 40,
        left: paper && rect ? Math.max(0, Math.min(rect.left - paper.left, paper.width - 300)) : 0,
      })
    },
    onKey: () => false,
  }))
  const [extensions] = useState(() => buildExtensions(controller))

  async function flush(editor: Editor) {
    timer.current = undefined
    const result = await savePageAction(view.id, {
      title: latest.current.title,
      status: latest.current.status,
      tag: latest.current.tag.trim() || null,
      content: plainDocOf(editor),
    })
    if (result.ok) {
      setSaveState('saved')
      setSavedText('Guardado hace un momento')
      return
    }
    setSaveState('error')
    toast.show({ message: result.message ?? 'No se pudo guardar la página.', icon: 'info' })
  }

  // Espera a que dejes de escribir y guarda. Escribir otra vez reinicia la espera.
  function queueSave(editor: Editor) {
    setSaveState('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(editor), AUTOSAVE_MS)
  }

  // Al salir del título o del editor (por ejemplo al tocar un enlace) se guarda enseguida lo que esté esperando.
  function flushNow() {
    const editor = editorRef.current
    if (timer.current && editor) {
      clearTimeout(timer.current)
      void flush(editor)
    }
  }

  const editor = useEditor({
    extensions,
    content: view.content,
    // Next pinta primero en el servidor: el editor aparece al llegar al navegador, sin desajustar el HTML.
    immediatelyRender: false,
    editorProps: {
      attributes: { 'aria-label': 'Contenido de la página', 'aria-multiline': 'true' },
      transformPastedHTML: stripUnsafeImages,
      // Ctrl+K (o Cmd+K) abre el diálogo de enlace, como en casi cualquier editor.
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault()
          setLinkDialog({ href: editorRef.current?.getAttributes('link').href ?? '' })
          return true
        }
        return false
      },
    },
    onCreate: ({ editor: created }) => {
      editorRef.current = created
    },
    onUpdate: ({ editor: updated }) => {
      setWords(tiptapWordCount(docOf(updated)))
      queueSave(updated)
    },
    onBlur: () => flushNow(),
  })

  const items: SlashItem[] = slash ? filterSlashItems(slash.query) : []
  const selected = Math.min(slashIndex, Math.max(0, items.length - 1))

  // Inserta un bloque en el cursor. Desde el menú "/" primero se borra lo que se escribió ("/lista"); desde "Insertar", no.
  function insertBlock(item: SlashItem, range: Range | null) {
    if (!editor) return
    if (item.id === 'image' || item.id === 'gallery') {
      if (range) editor.chain().focus().deleteRange(range).run()
      setImageDialog(item.id)
      return
    }
    insertSimpleBlock(editor, range, item.id)
  }

  function pick(item: SlashItem) {
    if (slash) insertBlock(item, slash.range)
  }

  // El botón "Insertar" de la barra: abre (o cierra) el menú con todos los bloques, debajo del botón.
  function openInsert(anchor: HTMLElement) {
    if (insertMenu) {
      setInsertMenu(null)
      return
    }
    const paper = paperRef.current?.getBoundingClientRect()
    const rect = anchor.getBoundingClientRect()
    setInsertMenu({ top: paper ? rect.bottom - paper.top + 6 : 48, left: paper ? Math.max(0, Math.min(rect.left - paper.left, paper.width - 300)) : 0 })
  }

  // Se cierra al tocar fuera del menú o con Escape.
  const insertOpen = insertMenu !== null
  useEffect(() => {
    if (!insertOpen) return
    const close = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest('#insert-menu, [data-insert-trigger]')) setInsertMenu(null)
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setInsertMenu(null)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [insertOpen])

  function openLink() {
    setLinkDialog({ href: editor?.getAttributes('link').href ?? '' })
  }

  // Pone el enlace al texto elegido (o escribe la dirección como texto si no hay nada elegido); null lo quita.
  function applyLink(href: string | null) {
    setLinkDialog(null)
    if (!editor) return
    const chain = editor.chain().focus()
    if (href === null) {
      chain.extendMarkRange('link').unsetLink().run()
    } else if (editor.state.selection.empty && !editor.isActive('link')) {
      chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run()
    } else {
      chain.extendMarkRange('link').setLink({ href }).run()
    }
  }

  // Las flechas, Enter y Escape del menú "/" se atienden antes de que el editor las vea.
  function handleKeyCapture(event: KeyboardEvent) {
    if (!slash || items.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setSlashIndex((selected + step + items.length) % items.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      event.stopPropagation()
      pick(items[selected])
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

  function handleTitle(value: string) {
    setTitle(value)
    latest.current.title = value
    if (editorRef.current) queueSave(editorRef.current)
  }

  function handleStatus(value: PageStatus) {
    setStatus(value)
    latest.current.status = value
    if (editorRef.current) queueSave(editorRef.current)
  }

  function handleTag(value: string) {
    setTag(value)
    latest.current.tag = value
    if (editorRef.current) queueSave(editorRef.current)
  }

  function downloadText() {
    setMenuOpen(false)
    if (!editor) return
    const text = `${title.trim() || 'Sin título'}\n\n${editor.getText({ blockSeparator: '\n\n' })}\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${(title.trim() || 'pagina').toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/^-|-$/g, '') || 'pagina'}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  function askDelete() {
    setMenuOpen(false)
    setBlockCount(editor?.state.doc.childCount ?? 0)
    setConfirmDelete(true)
  }

  function handleDelete() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = undefined
    startDelete(async () => {
      const result = await deletePageAction(view.id)
      if (!result.ok) {
        setConfirmDelete(false)
        toast.show({ message: result.message ?? 'No se pudo borrar la página.', icon: 'info' })
        return
      }
      const token = result.undoToken
      toast.show({ message: `Se borró "${title.trim() || 'Sin título'}"`, icon: 'trash', onUndo: token ? () => void undoWritingAction(token) : undefined })
      router.push(view.backHref)
    })
  }

  const saveText = saveState === 'saved' ? savedText : saveState === 'pending' ? 'Guardando…' : 'No se pudo guardar'

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Ruta">
        {view.crumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} className={styles.crumbItem}>
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className={styles.crumbLink}>
                {crumb.label}
              </Link>
            ) : (
              <span className={styles.crumbHere} aria-current="page">
                {crumb.label}
              </span>
            )}
          </span>
        ))}
        <span className={styles.crumbSpacer} />
        <span className={[styles.saved, saveState === 'error' ? styles.savedError : null].filter(Boolean).join(' ')} role="status" aria-live="polite">
          <LineIcon d={WRITING_ICON.check} size={14} strokeWidth={2.2} />
          {saveText}
        </span>
        <div
          className={styles.menuWrap}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMenuOpen(false)
          }}
        >
          <button type="button" className={styles.more} aria-label="Opciones de la página" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <LineIcon d={WRITING_ICON.more} size={20} strokeWidth={3} />
          </button>
          {menuOpen ? (
            <div className={styles.menu} role="menu">
              <button type="button" role="menuitem" className={styles.menuItem} onClick={downloadText}>
                <LineIcon d="M12 3v12M7 10l5 5 5-5M5 21h14" size={16} />
                Descargar como texto
              </button>
              <button type="button" role="menuitem" className={[styles.menuItem, styles.menuDanger].join(' ')} onClick={askDelete}>
                <LineIcon d={WRITING_ICON.trash} size={16} />
                Borrar página
              </button>
            </div>
          ) : null}
        </div>
      </nav>

      <div className={styles.cover}>
        <svg className={styles.coverArt} viewBox="0 0 800 150" preserveAspectRatio="xMidYMid slice" width="100%" height="150" aria-hidden="true">
          <circle cx="640" cy="60" r="34" fill="var(--text-on-inverted)" opacity="0.9" />
          <circle cx="626" cy="52" r="34" fill="var(--accent-ink)" />
          <g fill="var(--text-on-inverted)">
            <circle cx="120" cy="40" r="2" />
            <circle cx="220" cy="90" r="1.5" />
            <circle cx="380" cy="30" r="2" />
            <circle cx="470" cy="110" r="1.5" />
            <circle cx="720" cy="120" r="2" />
          </g>
        </svg>
        <button type="button" className={styles.coverButton} onClick={() => toast.show({ message: 'Cambiar la portada llega junto con la subida de imágenes.', icon: 'info' })}>
          <LineIcon d={WRITING_ICON.image} size={14} strokeWidth={2} />
          Cambiar portada
        </button>
      </div>

      <article ref={paperRef} className={styles.paper} aria-labelledby="pg-t">
        <span className={styles.icon} aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M30 24A11 11 0 0 1 16 10a11 11 0 1 0 14 14z" fill="var(--accent)" />
          </svg>
        </span>
        <label htmlFor="pg-t" className={styles.srOnly}>
          Título de la página
        </label>
        <input
          id="pg-t"
          className={styles.titleInput}
          type="text"
          value={title}
          maxLength={120}
          placeholder="Sin título"
          autoComplete="off"
          onChange={(event) => handleTitle(event.target.value)}
          onBlur={flushNow}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              editor?.commands.focus('start')
            }
          }}
        />

        <div className={styles.props}>
          {view.story ? (
            <div className={styles.prop}>
              <span className={styles.propName}>Historia</span>
              <Link href="/escritos" className={[styles.chip, styles.chipLink].join(' ')}>
                {view.story.title}
              </Link>
            </div>
          ) : null}
          {view.kind === 'note' ? (
            <div className={styles.prop}>
              <label htmlFor="pg-tag" className={styles.propName}>
                Etiqueta
              </label>
              <input id="pg-tag" className={styles.tagInput} type="text" value={tag} maxLength={30} placeholder="Sin etiqueta" autoComplete="off" onChange={(event) => handleTag(event.target.value)} onBlur={flushNow} />
            </div>
          ) : (
            <div className={styles.prop}>
              <label htmlFor="pg-status" className={styles.propName}>
                Estado
              </label>
              <select id="pg-status" className={styles.statusSelect} value={status} onChange={(event) => handleStatus(event.target.value as PageStatus)}>
                {PAGE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {PAGE_STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
          )}
          {view.characters.length > 0 ? (
            <div className={styles.prop}>
              <span className={styles.propName}>Personajes</span>
              <div className={styles.chips}>
                {view.characters.map((character) => (
                  <Link key={character.id} href={`/escritos/personajes/tabla?abrir=${character.id}`} className={styles.person}>
                    <Avatar initial={character.initial} tone={character.tone} size={22} />
                    {character.shortName}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <div className={styles.prop}>
            <span className={styles.propName}>Palabras</span>
            <span className={styles.words}>
              {formatCount(words)}
              <span className={styles.wordsHint}> · {view.story ? `cuentan para la meta de “${view.story.title}”` : 'cuentan para tu meta de la semana'}</span>
            </span>
          </div>
        </div>

        <EditorToolbar editor={editor} onLink={openLink} onInsert={openInsert} onImage={setImageDialog} />

        <div className={styles.editorWrap} onKeyDownCapture={handleKeyCapture}>
          {editor ? <EditorContent editor={editor} className={styles.content} /> : <EditorSkeleton />}
        </div>

        {slash ? <SlashMenu items={items} selected={selected} top={slash.top} left={slash.left} onPick={pick} /> : null}
        {insertMenu ? (
          <SlashMenu
            id="insert-menu"
            items={SLASH_ITEMS}
            selected={-1}
            top={insertMenu.top}
            left={insertMenu.left}
            onPick={(item) => {
              setInsertMenu(null)
              insertBlock(item, null)
            }}
          />
        ) : null}
      </article>

      <ImageDialog kind={imageDialog} onClose={() => setImageDialog(null)} onInsert={insertImages} />

      {linkDialog ? <LinkDialog initialHref={linkDialog.href} onClose={() => setLinkDialog(null)} onApply={applyLink} /> : null}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        tone="danger"
        title={`¿Borrar "${title.trim() || 'Sin título'}"?`}
        description={`Va a la papelera 30 días con sus ${blockCount} ${blockCount === 1 ? 'bloque' : 'bloques'} e imágenes. Las bases de datos enlazadas no se borran.`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              Borrar página
            </Button>
          </>
        }
      />
    </div>
  )
}

// Lo que se ve el instante en que el editor todavía no llegó al navegador.
function EditorSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <Skeleton width="92%" height={16} />
      <Skeleton width="78%" height={16} />
      <Skeleton width="86%" height={16} />
    </div>
  )
}
