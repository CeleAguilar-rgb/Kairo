'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useTransition } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { LineIcon } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { EASE_OUT } from '@/lib/motion'

import { createNoteAction } from '../story-actions'
import type { NoteCard } from '../types'
import { WRITING_ICON } from '../writing-meta'
import { plural } from '../writing-utils'

import { CoverArt } from './CoverArt'
import { Chip } from './Tone'
import styles from './NotesView.module.css'

// Notas (EscritosInicio, pestaña Notas): tarjetas en columnas, cada una con su ilustración, su texto o sus casillas,
// su etiqueta y cuándo se tocó. "Nueva nota" crea una en blanco que aparece arriba de las demás.
export function NotesView({ notes }: { notes: NoteCard[] }) {
  const calm = useCalmEntry()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function addNote() {
    startTransition(async () => {
      const result = await createNoteAction()
      if (!result.ok) toast.show({ message: result.message ?? 'No se pudo crear la nota.', icon: 'info' })
    })
  }

  return (
    <div className={styles.notes}>
      <button type="button" className={styles.drop} onClick={addNote} disabled={pending}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="9" width="30" height="24" rx="5" fill="var(--accent-soft)" />
          <path d="M5 27l9-8 7 6 5-4 9 7" />
          <circle cx="26" cy="16" r="2.5" />
        </svg>
        <span className={styles.dropTitle}>Nueva nota</span>
        <span className={styles.hint}>Toca para empezar a escribir</span>
      </button>

      {/* `initial={!calm}`: las notas que ya estaban al cambiar de pestaña no repiten su entrada; una nota que se agrega después sí entra. */}
      <AnimatePresence initial={!calm}>
        {notes.map((note, index) => (
          <motion.div
            key={note.id}
            className={styles.item}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT, delay: calm ? 0 : Math.min(index, 8) * 0.05 } }}
          >
            <Link href={`/escritos/paginas/${note.id}`} className={styles.note}>
              {note.cover ? <CoverArt preset={note.cover} /> : null}
              <div className={styles.body}>
                <span className={styles.title}>{note.title}</span>
                {note.excerpt ? <span className={styles.excerpt}>{note.excerpt}</span> : null}
                {!note.excerpt && note.checklist.length === 0 ? <span className={styles.excerpt}>Toca para escribir o agregar imágenes.</span> : null}
                {note.checklist.length > 0 ? (
                  <span className={styles.checklist}>
                    {note.checklist.map((item, itemIndex) => (
                      <span key={itemIndex} className={styles.check}>
                        <span className={[styles.box, item.done ? styles.boxDone : null].filter(Boolean).join(' ')} aria-hidden="true" />
                        <span className={item.done ? styles.checkDone : undefined}>{item.text}</span>
                      </span>
                    ))}
                  </span>
                ) : null}
                <span className={styles.meta}>
                  <Chip tone={note.tagTone}>{note.tag}</Chip>
                  {note.imageCount > 0 ? (
                    <span className={styles.images}>
                      <LineIcon d={WRITING_ICON.image} size={12} strokeWidth={2} />
                      {plural(note.imageCount, 'imagen', 'imágenes')}
                    </span>
                  ) : null}
                  <span className={styles.spacer} />
                  <span className={styles.when}>{note.whenText}</span>
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
