'use client'

import { motion } from 'motion/react'
import { useState, useTransition } from 'react'

import { useCalmEntry } from '@/components/layout/SectionPanel'
import { Button } from '@/components/ui/Button'
import { Card, LineIcon } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { dayOfMonth, diffDays, formatMonthShort, type IsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { fadeUp, staggerList } from '@/lib/motion'

import { CADENCE_LABEL, FINANCE_ICON } from '../finance-meta'
import { cardKindText, cardLabel } from '../finance-utils'
import { deleteCardAction } from '../membership-actions'
import { undoFinanceAction } from '../transaction-actions'
import type { CardView, Membership, MembershipsView as MembershipsData } from '../types'

import colors from './FinanceColors.module.css'
import { FinanceToolbar } from './FinanceToolbar'
import { MembershipDrawer, type MembershipPanel } from './MembershipDrawer'
import styles from './MembershipsView.module.css'

// Un cobro dentro de estos días se marca oscuro ("ya viene"), igual que en Inicio.
const SOON_DAYS = 3

// Membresías (Finanzas.dc.html y FinMembresia.dc.html): las tarjetas con lo que cada una paga al mes (tocar una
// filtra la tabla) y la tabla de membresías con su próximo cobro. Un toque en una membresía la abre para
// corregirla, pausarla o borrarla.
export function MembershipsView({ view, today }: { view: MembershipsData; today: IsoDate }) {
  const calm = useCalmEntry()
  const [selected, setSelected] = useState<string | null>(null)
  const [panel, setPanel] = useState<MembershipPanel>(null)
  const [deleting, setDeleting] = useState<CardView | null>(null)

  // Si la tarjeta que filtraba se borró, ya no hay filtro.
  const filter = selected && view.cards.some((card) => card.id === selected) ? selected : null

  return (
    <>
      <FinanceToolbar
        action={
          <Button onClick={() => setPanel({ type: 'membership', membership: null })}>
            <LineIcon d={FINANCE_ICON.plus} size={16} strokeWidth={2} />
            Agregar membresía
          </Button>
        }
      >
        <span className={styles.stat}>
          <span className={styles.statValue}>{formatMoney(view.monthlyCents)}</span>
          <span className={styles.statLabel}>en membresías al mes</span>
        </span>
        <span className={styles.stat}>
          <span className={styles.statValue}>{view.activeCount}</span>
          <span className={styles.statLabel}>{view.activeCount === 1 ? 'membresía activa' : 'membresías activas'}</span>
        </span>
      </FinanceToolbar>

      <motion.div className={styles.grid} variants={staggerList(0.08, 0.1)} initial={calm ? false : 'hidden'} animate="show">
        <motion.section className={styles.c4} variants={fadeUp} aria-labelledby="fin-cards">
          <div className={styles.head}>
            <div className={styles.headTitle}>
              <span className={[styles.h2i, styles.h2iInk].join(' ')} aria-hidden="true">
                <LineIcon d={FINANCE_ICON.card} />
              </span>
              <h2 id="fin-cards" className={styles.title}>
                Tarjetas
              </h2>
            </div>
            <span className={styles.hint}>Toca una para filtrar</span>
          </div>

          {view.cards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              selected={filter === card.id}
              dimmed={filter !== null && filter !== card.id}
              onPick={() => setSelected(filter === card.id ? null : card.id)}
              onDelete={() => setDeleting(card)}
            />
          ))}

          <div className={styles.cardActions}>
            <Button variant="ghost" onClick={() => setPanel({ type: 'card' })}>
              <LineIcon d={FINANCE_ICON.plus} size={14} strokeWidth={2.2} />
              Nueva tarjeta
            </Button>
            {filter ? (
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Ver todas
              </Button>
            ) : null}
          </div>
        </motion.section>

        <motion.div className={styles.c8} variants={fadeUp}>
          <Card as="section" className={styles.tableCard} aria-labelledby="fin-memberships">
            <div className={styles.head}>
              <div className={styles.headTitle}>
                <span className={[styles.h2i, styles.h2iAccent].join(' ')} aria-hidden="true">
                  <LineIcon d={FINANCE_ICON.repeat} />
                </span>
                <h2 id="fin-memberships" className={styles.title}>
                  Membresías
                </h2>
              </div>
            </div>

            {view.memberships.length === 0 ? (
              <p className={styles.empty}>Todavía no tienes membresías. Agrega Netflix, el gimnasio o lo que pagues cada cierto tiempo.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Servicio</th>
                      <th scope="col">Próximo cobro</th>
                      <th scope="col">Tarjeta</th>
                      <th scope="col">Estado</th>
                      <th scope="col" className={styles.right}>
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.memberships.map((membership) => (
                      <MembershipRow
                        key={membership.id}
                        membership={membership}
                        today={today}
                        dimmed={filter !== null && membership.card?.id !== filter}
                        onOpen={() => setPanel({ type: 'membership', membership })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>

      <MembershipDrawer panel={panel} cards={view.cards} today={today} onClose={() => setPanel(null)} />
      <DeleteCardDialog card={deleting} memberships={view.memberships} onClose={() => setDeleting(null)} />
    </>
  )
}

type CardTileProps = {
  card: CardView
  selected: boolean
  dimmed: boolean
  onPick: () => void
  onDelete: () => void
}

// Una tarjeta del canvas: el color que se eligió, los últimos 4 y cuánto suman sus membresías. Es un botón que
// filtra la tabla; el bote de basura es otro botón al lado (un botón no puede ir dentro de otro).
function CardTile({ card, selected, dimmed, onPick, onDelete }: CardTileProps) {
  return (
    <div className={styles.tileWrap}>
      <button
        type="button"
        className={[styles.tile, colors[`card_${card.color}`], selected ? styles.tileOn : null, dimmed ? styles.tileDim : null].filter(Boolean).join(' ')}
        aria-pressed={selected}
        onClick={onPick}
      >
        <span className={styles.tileName}>{card.name}</span>
        <span className={styles.tileNumber}>{card.kind === 'cash' || !card.last4 ? cardKindText(card) : `•••• ${card.last4}`}</span>
        <span className={styles.tileFoot}>
          <span>
            {card.membershipCount} {card.membershipCount === 1 ? 'membresía' : 'membresías'}
          </span>
          <span>{formatMoney(card.monthlyCents)} al mes</span>
        </span>
      </button>
      <button type="button" className={styles.tileTrash} aria-label={`Borrar tarjeta ${card.name}`} onClick={onDelete}>
        <LineIcon d={FINANCE_ICON.trash} size={16} />
      </button>
    </div>
  )
}

function MembershipRow({ membership, today, dimmed, onOpen }: { membership: Membership; today: IsoDate; dimmed: boolean; onOpen: () => void }) {
  const paused = membership.status === 'paused'
  const soon = !paused && diffDays(today, membership.nextChargeOn) <= SOON_DAYS
  return (
    <tr className={[styles.row, paused ? styles.paused : null, dimmed ? styles.rowDim : null].filter(Boolean).join(' ')}>
      <td>
        <button type="button" className={styles.service} onClick={onOpen} aria-label={`${membership.name}, ${CADENCE_LABEL[membership.cadence].toLowerCase()}. Editar`}>
          <span className={styles.initial} aria-hidden="true">
            {membership.name.charAt(0).toUpperCase()}
          </span>
          <span className={styles.serviceText}>
            <span className={styles.serviceName}>{membership.name}</span>
            <span className={styles.hint}>{CADENCE_LABEL[membership.cadence]}</span>
          </span>
        </button>
      </td>
      <td>
        {paused ? (
          <span className={styles.hint}>—</span>
        ) : (
          <span className={[styles.date, soon ? styles.dateSoon : null].filter(Boolean).join(' ')}>
            {dayOfMonth(membership.nextChargeOn)} {formatMonthShort(membership.nextChargeOn)}
          </span>
        )}
      </td>
      <td className={styles.cardCell}>{cardLabel(membership.card)}</td>
      <td>
        <span className={[styles.status, paused ? styles.statusPaused : styles.statusActive].join(' ')}>{paused ? 'Pausada' : 'Activa'}</span>
      </td>
      <td className={[styles.right, styles.amount].join(' ')}>{formatMoney(membership.amountCents, membership.currency)}</td>
    </tr>
  )
}

// Borrar una tarjeta arrastra a sus membresías: se muestran antes de borrar (el canvas las lista) y los
// movimientos pasados se quedan. Va a la papelera, con "Deshacer".
function DeleteCardDialog({ card, memberships, onClose }: { card: CardView | null; memberships: Membership[]; onClose: () => void }) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const mine = card ? memberships.filter((membership) => membership.card?.id === card.id) : []
  const label = card ? cardLabel(card) : ''

  function handleDelete() {
    if (!card) return
    startTransition(async () => {
      const result = await deleteCardAction(card.id)
      if (!result.ok) {
        toast.show({ message: result.message ?? 'No se pudo borrar la tarjeta.', icon: 'info' })
        return
      }
      const token = result.undoToken
      toast.show({
        message: mine.length > 0 ? `Se borró ${label} y sus ${mine.length} ${mine.length === 1 ? 'membresía' : 'membresías'}` : `Se borró ${label}`,
        icon: 'trash',
        onUndo: token ? () => void undoFinanceAction(token) : undefined,
      })
      onClose()
    })
  }

  return (
    <Modal
      open={card !== null}
      onClose={onClose}
      tone="danger"
      icon={<LineIcon d={FINANCE_ICON.trash} size={22} />}
      title={mine.length > 0 ? `¿Borrar ${label} y sus ${mine.length} ${mine.length === 1 ? 'membresía' : 'membresías'}?` : `¿Borrar la tarjeta ${label}?`}
      description={mine.length > 0 ? 'Se van a la papelera junto con la tarjeta:' : 'Va a la papelera. Tus movimientos pasados se quedan; solo dejan de mostrar esta tarjeta.'}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={pending}>
            {mine.length > 0 ? `Borrar tarjeta y ${mine.length} ${mine.length === 1 ? 'membresía' : 'membresías'}` : 'Borrar tarjeta'}
          </Button>
        </>
      }
    >
      {mine.length > 0 ? (
        <>
          <ul className={styles.dialogList}>
            {mine.map((membership) => (
              <li key={membership.id}>
                {membership.name} · {formatMoney(membership.amountCents, membership.currency)}
              </li>
            ))}
          </ul>
          <p className={styles.hint}>Tus movimientos pasados se quedan; solo dejan de mostrar esta tarjeta.</p>
        </>
      ) : null}
    </Modal>
  )
}
