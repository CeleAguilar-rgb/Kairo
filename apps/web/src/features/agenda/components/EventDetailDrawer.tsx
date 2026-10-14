'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { LineIcon } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { formatDayMonth } from '@/lib/dates'

import { dayLabel, meetingUrl, timeText, TYPE_LABEL } from '../agenda-utils'
import { EVENT_REMINDER_LABEL, EVENT_REPEAT_LABEL, type AgendaEntry } from '../types'

import styles from './EventDetailDrawer.module.css'
import types from './entry-types.module.css'

type EventDetailDrawerProps = {
  // El evento que se ve; null = cerrado
  entry: (AgendaEntry & { eventId: string }) | null
  hourFormat: '12h' | '24h'
  onClose: () => void
  onEdit: (entry: AgendaEntry) => void
  onDuplicate: (entry: AgendaEntry) => void
  onDelete: (entry: AgendaEntry) => void
}

// El detalle de un evento (EventoDetalle.dc.html): cuándo, el botón de la llamada si la hay, si se
// repite, dónde, el aviso, el proyecto y las notas. Arriba, el menú "Más opciones" (Duplicar, Borrar).
export function EventDetailDrawer({ entry, hourFormat, onClose, onEdit, onDuplicate, onDelete }: EventDetailDrawerProps) {
  // Se recuerda el último evento para que el panel pueda animar su salida con su contenido todavía puesto.
  const [last, setLast] = useState(entry)
  if (entry && entry !== last) setLast(entry)
  const shown = entry ?? last

  return (
    <Drawer open={entry !== null} onClose={onClose} title={shown ? `Detalle de ${shown.title}` : 'Detalle del evento'} hideTitle>
      {shown ? <Detail entry={shown} hourFormat={hourFormat} onClose={onClose} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} /> : null}
    </Drawer>
  )
}

function Detail({ entry, hourFormat, onClose, onEdit, onDuplicate, onDelete }: Omit<EventDetailDrawerProps, 'entry'> & { entry: AgendaEntry }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const call = meetingUrl(entry.place)
  const repeats = entry.repeat && entry.repeat !== 'none'

  return (
    <div className={styles.detail}>
      <div className={styles.top}>
        <span className={[styles.type, types[entry.type]].join(' ')}>{TYPE_LABEL[entry.type]}</span>
        <div className={styles.topActions}>
          <div className={styles.menuWrap}>
            <button type="button" className={styles.iconButton} aria-label="Más opciones" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              <LineIcon d="M5 12h.01M12 12h.01M19 12h.01" size={20} strokeWidth={3} />
            </button>
            {menuOpen ? (
              <div className={styles.menu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false)
                    onDuplicate(entry)
                  }}
                >
                  <LineIcon d={['M8 8h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z', 'M4 16V5a1 1 0 0 1 1-1h11']} size={16} />
                  Duplicar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={[styles.menuItem, styles.danger].join(' ')}
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(entry)
                  }}
                >
                  <LineIcon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={16} />
                  Borrar evento
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" className={styles.iconButton} aria-label="Cerrar detalle" onClick={onClose}>
            <LineIcon d="M6 6l12 12M18 6L6 18" size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className={styles.titles}>
        <h2 className={styles.title}>{entry.title}</h2>
        <span className={styles.when}>
          {dayLabel(entry.date)} · {timeText(entry, hourFormat)}
        </span>
      </div>

      {call ? (
        <ButtonLink href={call} target="_blank" rel="noopener noreferrer" className={styles.call}>
          <LineIcon d={['M15 10l5-3v10l-5-3', 'M4 7h9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z']} size={16} />
          Unirme a la llamada
        </ButtonLink>
      ) : null}

      <ul className={styles.rows}>
        {repeats ? (
          <li className={styles.row}>
            <span className={styles.rowIcon}>
              <LineIcon d={['M17 2l3 3-3 3', 'M4 11V9a4 4 0 0 1 4-4h12', 'M7 22l-3-3 3-3', 'M20 13v2a4 4 0 0 1-4 4H4']} size={16} />
            </span>
            <span className={styles.rowText}>
              <span>{EVENT_REPEAT_LABEL[entry.repeat ?? 'none']}</span>
              {entry.seriesStartsOn ? <span className={styles.hint}>Desde el {formatDayMonth(entry.seriesStartsOn)}</span> : null}
            </span>
          </li>
        ) : null}
        {entry.place ? (
          <li className={styles.row}>
            <span className={styles.rowIcon}>
              <LineIcon d={['M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z', 'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} size={16} />
            </span>
            <span className={styles.rowText}>{entry.place}</span>
          </li>
        ) : null}
        {entry.reminder && entry.reminder !== 'none' ? (
          <li className={styles.row}>
            <span className={styles.rowIcon}>
              <LineIcon d={['M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z', 'M10 20a2 2 0 0 0 4 0']} size={16} />
            </span>
            <span className={styles.rowText}>Aviso {EVENT_REMINDER_LABEL[entry.reminder].toLowerCase()}</span>
          </li>
        ) : null}
        {entry.project ? (
          <li className={styles.row}>
            <span className={styles.rowIcon}>
              <LineIcon d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" size={16} />
            </span>
            <span className={styles.rowText}>
              <Link href={`/proyectos/${entry.project.id}`} className={styles.link}>
                {entry.project.name}
              </Link>
            </span>
          </li>
        ) : null}
      </ul>

      <div className={styles.notes}>
        <h3 className={styles.notesTitle}>Notas</h3>
        <p className={entry.notes ? undefined : styles.hint}>{entry.notes || 'Sin notas todavía.'}</p>
      </div>

      <footer className={styles.footer}>
        <Button onClick={() => onEdit(entry)} className={styles.edit}>
          <LineIcon d="M14 4l6 6L9 21H3v-6L14 4z" size={16} />
          Editar evento
        </Button>
      </footer>
    </div>
  )
}
