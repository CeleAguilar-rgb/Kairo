'use client'

import { EVENT_DELETE_SCOPES, type EventDeleteScope } from '@kairo/shared'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { LineIcon } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatDayMonth, type IsoDate } from '@/lib/dates'

import { dayLabel } from '../agenda-utils'
import { EVENT_REPEAT_LABEL, type AgendaEntry } from '../types'

import styles from './EventDialogs.module.css'

type DeleteEventDialogProps = {
  // El evento que se quiere borrar; null = cerrado
  entry: AgendaEntry | null
  onClose: () => void
  onConfirm: (entry: AgendaEntry, scope: EventDeleteScope) => void
}

const SCOPE_LABEL: Record<EventDeleteScope, string> = { one: 'Solo este', next: 'Este y los siguientes', all: 'Toda la serie' }
const DELETE_LABEL: Record<EventDeleteScope, string> = { one: 'Borrar solo este', next: 'Borrar este y los siguientes', all: 'Borrar toda la serie' }

// Borrar un evento (EventoDetalle.dc.html): si se repite, se pregunta cuáles; si no, solo se confirma.
// Va a la papelera: el aviso que sigue permite deshacerlo.
export function DeleteEventDialog({ entry, onClose, onConfirm }: DeleteEventDialogProps) {
  // El contenido vive en un componente aparte con `key` por evento: cada vez que se abre empieza con
  // "Solo este" elegido, sin tener que limpiarlo a mano.
  const [last, setLast] = useState(entry)
  if (entry && entry !== last) setLast(entry)
  const shown = entry ?? last
  const repeats = shown?.repeat !== undefined && shown.repeat !== 'none'

  return (
    <DeleteBody key={shown?.id ?? 'none'} shown={shown} open={entry !== null} repeats={repeats} onClose={onClose} onConfirm={onConfirm} />
  )
}

function DeleteBody({ shown, open, repeats, onClose, onConfirm }: { shown: AgendaEntry | null; open: boolean; repeats: boolean; onClose: () => void; onConfirm: DeleteEventDialogProps['onConfirm'] }) {
  const [scope, setScope] = useState<EventDeleteScope>('one')

  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title={shown ? `Borrar "${shown.title}"` : ''}
      description={
        repeats && shown?.repeat
          ? `Este evento se repite ${EVENT_REPEAT_LABEL[shown.repeat].toLowerCase()}. ¿Cuáles quieres borrar?`
          : 'Se va a la papelera. Puedes recuperarlo durante 30 días.'
      }
      icon={<LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={22} />}
      actions={
        <>
          <Button variant="danger" onClick={() => shown && onConfirm(shown, repeats ? scope : 'one')}>
            {repeats ? DELETE_LABEL[scope] : 'Borrar evento'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      {repeats && shown ? (
        <div className={styles.scopes} role="radiogroup" aria-label="Cuáles borrar">
          {EVENT_DELETE_SCOPES.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={scope === value}
              className={[styles.scope, scope === value ? styles.scopeOn : null].filter(Boolean).join(' ')}
              onClick={() => setScope(value)}
            >
              <span className={styles.radio} aria-hidden="true" />
              <span className={styles.scopeText}>
                <span className={styles.scopeName}>{SCOPE_LABEL[value]}</span>
                <span className={styles.hint}>
                  {value === 'one'
                    ? dayLabel(shown.date)
                    : value === 'next'
                      ? `Desde el ${formatDayMonth(shown.date)} en adelante`
                      : `Incluye los anteriores${shown.seriesStartsOn ? `, desde el ${formatDayMonth(shown.seriesStartsOn)}` : ''}`}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </Modal>
  )
}

type MoveDayDialogProps = {
  entry: AgendaEntry | null
  pending: boolean
  onClose: () => void
  onConfirm: (entry: AgendaEntry, date: IsoDate) => void
}

// "Mover de día": se elige la fecha nueva y se conserva la hora. En una serie solo se mueve esa vez.
export function MoveDayDialog({ entry, pending, onClose, onConfirm }: MoveDayDialogProps) {
  const [last, setLast] = useState(entry)
  if (entry && entry !== last) setLast(entry)
  const shown = entry ?? last
  return <MoveBody key={shown?.id ?? 'none'} shown={shown} open={entry !== null} pending={pending} onClose={onClose} onConfirm={onConfirm} />
}

function MoveBody({ shown, open, pending, onClose, onConfirm }: { shown: AgendaEntry | null; open: boolean; pending: boolean; onClose: () => void; onConfirm: MoveDayDialogProps['onConfirm'] }) {
  const [date, setDate] = useState(shown?.date ?? '')
  const unchanged = !shown || date === shown.date || date === ''
  const repeats = shown?.repeat !== undefined && shown.repeat !== 'none'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={shown ? `Mover "${shown.title}"` : ''}
      description={repeats ? 'Solo se mueve esta vez; el resto de la serie sigue igual.' : 'Conserva su hora y pasa a otro día.'}
      actions={
        <>
          <Button onClick={() => shown && onConfirm(shown, date)} disabled={unchanged || pending}>
            {pending ? 'Moviendo…' : 'Mover'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <Input id="move-date" label="Nueva fecha" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
    </Modal>
  )
}
