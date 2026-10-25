'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Button } from '@/components/ui/Button'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { Card, LineIcon } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { fadeUp, staggerList } from '@/lib/motion'

import { createChapterAction } from '../story-actions'
import type { BookView } from '../types'
import { WRITING_ICON } from '../writing-meta'

import { Avatar, Chip } from './Tone'
import { StoryDrawer } from './StoryDrawer'
import styles from './StoriesView.module.css'
import colors from './WritingColors.module.css'

// Historias (EscritosInicio, pestaña Historias): a la izquierda los libros como lomos con su avance, a la derecha el
// libro elegido con sus capítulos (o las páginas de un cuaderno) y los personajes que aparecen en él. Elegir otro
// libro no cambia de ruta: es un cambio dentro de la misma pantalla.
export function StoriesView({ books }: { books: BookView[] }) {
  const calm = useCalmEntry()
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(books[0]?.id ?? null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Si el libro elegido ya no existe, queda el primero.
  const current = books.find((book) => book.id === selectedId) ?? books[0] ?? null

  function addPage(book: BookView) {
    startTransition(async () => {
      const result = await createChapterAction(book.id, book.kind)
      if (!result.ok || !result.id) {
        toast.show({ message: result.ok ? 'No se pudo crear la página.' : (result.message ?? 'No se pudo crear la página.'), icon: 'info' })
        return
      }
      router.push(`/escritos/paginas/${result.id}`)
    })
  }

  return (
    <>
      <motion.div className={styles.split} variants={staggerList(0.08, 0.05)} initial={calm ? false : 'hidden'} animate="show">
        <motion.div className={styles.books} variants={fadeUp}>
          {books.map((book) => {
            const on = book.id === current?.id
            return (
              <button key={book.id} type="button" className={[styles.book, on ? styles.bookOn : null].filter(Boolean).join(' ')} aria-pressed={on} onClick={() => setSelectedId(book.id)}>
                <span className={[styles.spine, colors[`spine_${book.color}`]].join(' ')} aria-hidden="true">
                  {book.initial}
                </span>
                <span className={styles.bookText}>
                  <span className={styles.bookTitle}>{book.title}</span>
                  <span className={styles.hint}>{book.subText}</span>
                  {book.progress !== null ? (
                    <span className={styles.track} role="presentation">
                      <span className={styles.fill} style={{ width: `${Math.max(4, Math.round(book.progress * 100))}%` }} />
                    </span>
                  ) : null}
                  <span className={styles.hintSmall}>{book.wordsText}</span>
                </span>
              </button>
            )
          })}
          <button type="button" className={styles.addBook} onClick={() => setDrawerOpen(true)}>
            <LineIcon d={WRITING_ICON.plus} size={16} strokeWidth={2.2} />
            Nueva historia o cuaderno
          </button>
        </motion.div>

        {current ? (
          <motion.div variants={fadeUp}>
            <Card as="section" className={styles.detail} aria-labelledby="writings-book">
              <div className={styles.detailHead}>
                <div className={styles.detailTitles}>
                  <span className={styles.hint}>{current.kicker}</span>
                  <h2 id="writings-book" className={styles.detailTitle}>
                    {current.title}
                  </h2>
                </div>
                {current.continueId ? (
                  <ButtonLink href={`/escritos/paginas/${current.continueId}`}>
                    <LineIcon d={WRITING_ICON.pencil} size={16} />
                    Seguir escribiendo
                  </ButtonLink>
                ) : null}
              </div>

              {current.summary ? <p className={styles.summary}>{current.summary}</p> : null}

              <div className={styles.list}>
                <h3 className={styles.listTitle}>{current.listTitle}</h3>
                {current.rows.map((row) => (
                  <Link key={row.id} href={`/escritos/paginas/${row.id}`} className={styles.row}>
                    <span className={styles.rowLabel}>{row.label}</span>
                    <span className={styles.rowTitle}>{row.title}</span>
                    <span className={[styles.hint, styles.hideSmall].join(' ')}>{row.wordsText}</span>
                    <Chip tone={row.chipTone}>{row.chipText}</Chip>
                  </Link>
                ))}
                {current.rows.length === 0 ? <p className={styles.emptyRows}>{current.kind === 'story' ? 'Esta historia todavía no tiene capítulos.' : 'Este cuaderno todavía no tiene páginas.'}</p> : null}
                <div className={styles.addRow}>
                  <Button variant="ghost" onClick={() => addPage(current)} disabled={pending}>
                    <LineIcon d={WRITING_ICON.plus} size={14} strokeWidth={2.2} />
                    {current.kind === 'story' ? 'Agregar capítulo' : 'Agregar página'}
                  </Button>
                </div>
              </div>

              {current.characters.length > 0 ? (
                <div className={styles.people}>
                  <h3 className={styles.listTitle}>Personajes en esta historia</h3>
                  <div className={styles.chips}>
                    {current.characters.map((character) => (
                      <Link key={character.id} href={`/escritos/personajes/tabla?abrir=${character.id}`} className={styles.person}>
                        <Avatar initial={character.initial} tone={character.tone} size={32} />
                        {character.shortName}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          </motion.div>
        ) : null}
      </motion.div>

      <StoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={setSelectedId} />
    </>
  )
}
