'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'

import { LineIcon } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { EASE_OUT } from '@/lib/motion'
import { useDialogFocus } from '@/lib/use-dialog-focus'
import { useMounted } from '@/lib/use-mounted'

import { createQuickTask } from '../create-task'
import { searchAction } from '../search-actions'
import { hitHref, hitSub, KIND_GROUP, KIND_ICON } from '../search-text'
import type { SearchHit } from '../types'

import styles from './SearchPalette.module.css'

type SearchPaletteProps = {
  open: boolean
  onClose: () => void
  demo: boolean
}

// Una fila de la lista: un resultado o la acción "Crear tarea".
type Row = { key: string; group: string; title: string; sub: string; icon: string; tone: string; href: string | null; hit: SearchHit | null }

const DEBOUNCE_MS = 200
const PLUS_ICON = 'M12 5v14M5 12h14'

// Ctrl+K (Atajos.dc.html): busca en todo lo de la persona mientras escribe, agrupa por sección y se maneja con el
// teclado (↑ ↓ para moverse, Enter para abrir, Esc para cerrar). Al final ofrece "Crear tarea" con lo escrito; si
// el texto empieza con "+", solo ofrece crear.
export function SearchPalette({ open, onClose, demo }: SearchPaletteProps) {
  const mounted = useMounted()
  const router = useRouter()
  const toast = useToast()
  const listId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [selected, setSelected] = useState(0)
  const [searching, startSearch] = useTransition()
  useDialogFocus(open, panelRef, onClose)

  const trimmed = query.trim()
  const creating = trimmed.startsWith('+')
  const taskTitle = (creating ? trimmed.slice(1) : trimmed).trim()

  // Buscar con una pausa corta después de la última tecla, para no pedir una búsqueda por letra.
  useEffect(() => {
    if (!open || creating || trimmed.length < 2) return
    const timer = setTimeout(() => {
      startSearch(async () => {
        const result = await searchAction(trimmed)
        if (result.ok) setHits(result.hits)
        else toast.show({ message: result.message, icon: 'info' })
      })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [open, trimmed, creating, toast])

  const shownHits = creating || trimmed.length < 2 ? [] : hits
  const rows: Row[] = shownHits.map((hit) => ({
    key: `${hit.kind}:${hit.id}`,
    group: KIND_GROUP[hit.kind],
    title: hit.title || 'Sin título',
    sub: hitSub(hit),
    icon: KIND_ICON[hit.kind].d,
    tone: KIND_ICON[hit.kind].tone,
    href: hitHref(hit),
    hit,
  }))
  if (taskTitle) {
    rows.push({ key: 'create-task', group: 'Acciones', title: `Crear tarea "${taskTitle}"`, sub: 'Se guarda en Tareas, sin fecha', icon: PLUS_ICON, tone: 'plain', href: null, hit: null })
  }
  const active = Math.min(selected, Math.max(rows.length - 1, 0))

  function reset() {
    setQuery('')
    setHits([])
    setSelected(0)
  }

  function close() {
    reset()
    onClose()
  }

  async function choose(row: Row) {
    if (row.href) {
      close()
      router.push(row.href)
      return
    }
    if (demo) {
      toast.show({ message: 'En el modo demo no se guarda nada: es solo para mirar.', icon: 'info' })
      return
    }
    const error = await createQuickTask(taskTitle, null)
    if (error) {
      toast.show({ message: error, icon: 'info' })
      return
    }
    close()
    router.refresh()
    toast.show({ message: `Tarea guardada: ${taskTitle}`, icon: 'check' })
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected(Math.min(active + 1, rows.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected(Math.max(active - 1, 0))
    } else if (event.key === 'Enter' && rows[active]) {
      event.preventDefault()
      void choose(rows[active])
    }
  }

  if (!mounted) return null

  // Los grupos en el orden en que llegan los resultados (la API ya los ordena por sección).
  const groups: { name: string; rows: { row: Row; index: number }[] }[] = []
  rows.forEach((row, index) => {
    const group = groups.find((candidate) => candidate.name === row.group) ?? groups[groups.push({ name: row.group, rows: [] }) - 1]
    group.rows.push({ row, index })
  })
  const nothing = trimmed.length >= 2 && !creating && !searching && shownHits.length === 0

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={close}>
          <motion.div
            ref={panelRef}
            className={styles.palette}
            role="dialog"
            aria-modal="true"
            aria-label="Buscar"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            onAnimationComplete={() => inputRef.current?.focus()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.searchRow}>
              <LineIcon d={['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-3.5-3.5']} size={20} />
              <input
                ref={inputRef}
                className={styles.input}
                type="search"
                aria-label="Buscar"
                placeholder="Busca o escribe una acción"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSelected(0)
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded={rows.length > 0}
                aria-controls={listId}
                aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined}
              />
              <kbd className={styles.kbd}>Esc</kbd>
            </div>

            <div id={listId} role="listbox" aria-label="Resultados" className={styles.results} aria-busy={searching}>
              {groups.map((group) => (
                <div key={group.name} role="group" aria-label={group.name}>
                  <span className={styles.groupName}>{group.name}</span>
                  {group.rows.map(({ row, index }) => {
                    const on = index === active
                    return (
                      <div
                        key={row.key}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={on}
                        className={on ? styles.resultOn : styles.result}
                        onMouseEnter={() => setSelected(index)}
                        onClick={() => void choose(row)}
                      >
                        <span className={`${styles.icon} ${styles[row.tone]}`}>
                          <LineIcon d={[row.icon]} size={16} />
                        </span>
                        <span className={styles.resultText}>
                          <span className={styles.resultTitle}>{row.title}</span>
                          <span className={styles.resultSub}>{row.sub}</span>
                        </span>
                        {on ? <kbd className={styles.kbd}>Enter</kbd> : null}
                      </div>
                    )
                  })}
                </div>
              ))}
              {nothing ? <div className={styles.nothing}>Nada con &quot;{trimmed}&quot;. Prueba con otra palabra.</div> : null}
              {trimmed.length < 2 && !creating ? <div className={styles.nothing}>Tareas, proyectos, eventos, metas, movimientos y escritos.</div> : null}
            </div>

            <div className={styles.footer}>
              <span>
                <kbd className={styles.kbd}>↑</kbd> <kbd className={styles.kbd}>↓</kbd> moverte
              </span>
              <span>
                <kbd className={styles.kbd}>Enter</kbd> abrir
              </span>
              <span>
                Empieza con <kbd className={styles.kbd}>+</kbd> para crear
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
