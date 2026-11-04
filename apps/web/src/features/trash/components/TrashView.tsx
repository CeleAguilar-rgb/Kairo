'use client'

import { TRASH_GROUPS, type TrashGroup } from '@kairo/shared'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState, useTransition } from 'react'

import { PageHeading } from '@/components/layout/PageHeading'
import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Doodle } from '@/components/ui/Doodle'
import { useToast } from '@/components/ui/Toast'
import { listItem } from '@/lib/motion'

import { emptyTrashAction, purgeFromTrashAction, restoreFromTrashAction } from '../actions'
import { contentsText, daysLeft, GROUP_LABEL, GROUP_LETTER, itemMeta, itemName } from '../trash-text'
import type { TrashItem } from '../types'

import styles from './TrashView.module.css'

type Filter = 'all' | TrashGroup

type TrashViewProps = {
  items: TrashItem[]
  nowIso: string
  timeZone: string
}

const TRASH_ICON = ['M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13']
const RESTORE_ICON = ['M4 12a8 8 0 1 0 2.3-5.7', 'M4 4v4h4']
const SOON_DAYS = 7

// Papelera.dc.html: lo borrado de los últimos 30 días, con filtros, "Restaurar", "Borrar para siempre" (con su
// confirmación en la misma fila) y "Vaciar papelera" (con su aviso arriba). Las filas salen de la lista en cuanto se
// pica, sin esperar a la API; si la API falla, vuelven y sale el error.
export function TrashView({ items: initialItems, nowIso, timeZone }: TrashViewProps) {
  const toast = useToast()
  const now = useMemo(() => new Date(nowIso), [nowIso])
  const [items, setItems] = useState(initialItems)
  const [filter, setFilter] = useState<Filter>('all')
  const [asking, setAsking] = useState<string | null>(null)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [pending, startTransition] = useTransition()

  // Solo los grupos que el canvas pinta siempre, más "Otros" si hay algo de ahí.
  const groups = TRASH_GROUPS.filter((group) => group !== 'other' || items.some((item) => item.group === 'other'))
  const shown = items.filter((item) => filter === 'all' || item.group === filter)
  const keyOf = (item: TrashItem) => `${item.kind}:${item.id}`

  function removeLocally(item: TrashItem, action: () => Promise<{ ok: true } | { ok: false; message: string }>, success: string) {
    const before = items
    setItems((current) => current.filter((candidate) => keyOf(candidate) !== keyOf(item)))
    setAsking(null)
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        toast.show({ message: success, icon: 'check' })
      } else {
        setItems(before)
        toast.show({ message: result.message, icon: 'info' })
      }
    })
  }

  function restore(item: TrashItem) {
    const name = itemName(item, timeZone)
    const contents = contentsText(item)
    removeLocally(item, () => restoreFromTrashAction({ kind: item.kind, id: item.id }), `${name} se restauró${contents ? ` con ${contents}` : ''}.`)
  }

  function purge(item: TrashItem) {
    removeLocally(item, () => purgeFromTrashAction({ kind: item.kind, id: item.id }), `${itemName(item, timeZone)} se borró para siempre.`)
  }

  function empty() {
    const before = items
    setItems([])
    setConfirmEmpty(false)
    startTransition(async () => {
      const result = await emptyTrashAction()
      if (result.ok) {
        toast.show({ message: 'Papelera vaciada.', icon: 'check' })
      } else {
        setItems(before)
        toast.show({ message: result.message, icon: 'info' })
      }
    })
  }

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <PageHeading title="Papelera" doodle="spiral" doodleRotate={-8}>
          <p className={styles.lede}>Lo que borras se queda aquí 30 días. Después se borra para siempre.</p>
        </PageHeading>
        {items.length > 0 ? (
          <Button variant="ghost" className={styles.emptyButton} onClick={() => setConfirmEmpty(true)} disabled={pending}>
            <LineIcon d={TRASH_ICON} size={16} />
            Vaciar papelera
          </Button>
        ) : null}
      </section>

      <AnimatePresence>
        {confirmEmpty ? (
          <motion.div key="confirm" role="alert" className={styles.confirmEmpty} variants={listItem} initial="hidden" animate="show" exit="exit">
            <LineIcon d={['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 8v5M12 16h.01']} size={20} />
            <span className={styles.confirmText}>
              Se borrarán para siempre {items.length === 1 ? 'el elemento' : `los ${items.length} elementos`} de la papelera. Esto no se puede deshacer.
            </span>
            <Button variant="ghost" onClick={() => setConfirmEmpty(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={empty}>
              Vaciar papelera
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className={styles.card} aria-label="Elementos en la papelera">
        <div role="group" aria-label="Filtrar" className={styles.filters}>
          {(['all', ...groups] as Filter[]).map((value) => {
            const count = items.filter((item) => value === 'all' || item.group === value).length
            const selected = filter === value
            return (
              <button key={value} type="button" aria-pressed={selected} className={selected ? styles.filterOn : styles.filter} onClick={() => setFilter(value)}>
                {value === 'all' ? 'Todo' : GROUP_LABEL[value]}
                <span className={styles.filterCount}>{count}</span>
              </button>
            )
          })}
        </div>

        <ul className={styles.list}>
          <AnimatePresence initial={false}>
            {shown.map((item) => {
              const left = daysLeft(item.deletedAt, now)
              const soon = left <= SOON_DAYS
              const isAsking = asking === keyOf(item)
              const name = itemName(item, timeZone)
              return (
                <motion.li key={keyOf(item)} layout className={styles.row} variants={listItem} initial="hidden" animate="show" exit="exit">
                  <span className={`${styles.letter} ${styles[item.group]}`} aria-hidden="true">
                    {GROUP_LETTER[item.group]}
                  </span>
                  <div className={styles.text}>
                    <span className={styles.name}>{name}</span>
                    <span className={styles.meta}>{itemMeta(item, now)}</span>
                  </div>
                  <div className={styles.left}>
                    <span className={soon ? styles.leftSoon : styles.leftText}>{soon ? `Se borra en ${left} ${left === 1 ? 'día' : 'días'}` : `Quedan ${left} días`}</span>
                    <span className={styles.track}>
                      <motion.span
                        className={soon ? styles.barSoon : styles.bar}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        style={{ width: `${Math.round((left / 30) * 100)}%` }}
                        transition={{ duration: 0.7, ease: [0.3, 0.7, 0.2, 1] }}
                      />
                    </span>
                  </div>
                  <div className={styles.actions}>
                    {isAsking ? (
                      <div className={styles.asking}>
                        <span className={styles.askText}>¿Borrar para siempre?</span>
                        <Button variant="ghost" className={styles.small} onClick={() => setAsking(null)}>
                          Cancelar
                        </Button>
                        <Button variant="danger" className={styles.small} onClick={() => purge(item)}>
                          Borrar para siempre
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button variant="ghost" className={styles.small} onClick={() => restore(item)}>
                          <LineIcon d={RESTORE_ICON} size={16} />
                          Restaurar
                        </Button>
                        <button type="button" className={styles.deleteIcon} aria-label={`Borrar para siempre: ${name}`} onClick={() => setAsking(keyOf(item))}>
                          <LineIcon d={TRASH_ICON} size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>

        {shown.length === 0 ? (
          <div className={styles.empty}>
            <Doodle kind="star" size={56} />
            <span className={styles.emptyTitle}>{items.length === 0 ? 'La papelera está vacía' : `Nada de ${filter === 'all' ? '' : GROUP_LABEL[filter].toLowerCase()} en la papelera`}</span>
            <span className={styles.meta}>Lo que borres aparecerá aquí por 30 días.</span>
          </div>
        ) : null}
      </section>
    </div>
  )
}
