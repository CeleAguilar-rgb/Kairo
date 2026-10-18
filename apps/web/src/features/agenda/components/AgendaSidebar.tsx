import { ButtonLink } from '@/components/ui/ButtonLink'
import { Card, CardHeader, LineIcon } from '@/components/ui/Card'
import { dayOfMonth, weekdayOf, WEEKDAYS_SHORT } from '@/lib/dates'

import { dayLabel, FILTER_TYPES, startText, timeText, TYPE_LABEL } from '../agenda-utils'
import { isEventEntry, type AgendaEntry, type AgendaEntryType } from '../types'

import styles from './AgendaSidebar.module.css'
import types from './entry-types.module.css'

type AgendaSidebarProps = {
  selected: AgendaEntry | null
  upcoming: AgendaEntry[]
  counts: Record<AgendaEntryType, number>
  hidden: Set<AgendaEntryType>
  hourFormat: '12h' | '24h'
  onToggleFilter: (type: AgendaEntryType) => void
  onPickUpcoming: (entry: AgendaEntry) => void
  onOpenDetail: (entry: AgendaEntry) => void
  onEdit: (entry: AgendaEntry) => void
  onMove: (entry: AgendaEntry) => void
}

const CALENDAR_ICON = ['M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M3 10h18M8 3v4M16 3v4']

// Lo que acompaña al calendario: el detalle de lo que elegiste, lo que sigue y qué tipos mostrar.
export function AgendaSidebar({ selected, upcoming, counts, hidden, hourFormat, onToggleFilter, onPickUpcoming, onOpenDetail, onEdit, onMove }: AgendaSidebarProps) {
  return (
    <aside className={styles.side} aria-label="Detalle y filtros de la agenda">
      <Card tone="inverted" as="section" className={styles.card} aria-labelledby="agenda-detail">
        {selected ? (
          <>
            <CardHeader id="agenda-detail" title={selected.title} iconTone="inverted" icon={<LineIcon d={CALENDAR_ICON} />} />
            <div className={styles.meta}>
              <span>{dayLabel(selected.date)}</span>
              <span>{timeText(selected, hourFormat)}</span>
              <span className={[styles.typeChip, types[selected.type]].join(' ')}>{TYPE_LABEL[selected.type]}</span>
            </div>
            <p className={styles.note}>{selected.notes || selected.detail || 'Sin notas todavía.'}</p>
            <div className={styles.actions}>
              {isEventEntry(selected) ? (
                <>
                  <button type="button" className={styles.action} onClick={() => onOpenDetail(selected)}>
                    Ver detalle
                  </button>
                  <button type="button" className={styles.action} onClick={() => onEdit(selected)}>
                    <LineIcon d="M14 4l6 6L9 21H3v-6L14 4z" size={14} />
                    Editar
                  </button>
                  <button type="button" className={styles.action} onClick={() => onMove(selected)}>
                    Mover de día
                  </button>
                </>
              ) : selected.href ? (
                <ButtonLink href={selected.href} variant="ghost" className={styles.linkAction}>
                  {selected.type === 'payment' ? 'Abrir en Finanzas' : 'Abrir en Tareas'}
                </ButtonLink>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <CardHeader id="agenda-detail" title="Detalle" iconTone="inverted" icon={<LineIcon d={CALENDAR_ICON} />} />
            <p className={styles.note}>Elige algo del calendario para ver su detalle.</p>
          </>
        )}
      </Card>

      <Card as="section" className={styles.card} aria-labelledby="agenda-upcoming">
        <CardHeader id="agenda-upcoming" title="Próximos" iconTone="accent" icon={<LineIcon d={['M12 7v5l3 2', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z']} />} />
        {upcoming.length === 0 ? (
          <p className={styles.empty}>No hay nada próximo con estos filtros.</p>
        ) : (
          <ul className={styles.list}>
            {upcoming.map((entry) => (
              <li key={entry.id}>
                <button type="button" className={styles.row} onClick={() => onPickUpcoming(entry)}>
                  <span className={[styles.dateBox, types[entry.type]].join(' ')}>
                    <span className={styles.dateDay}>{dayOfMonth(entry.date)}</span>
                    <span className={styles.dateDow}>{WEEKDAYS_SHORT[weekdayOf(entry.date)]}</span>
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{entry.title}</span>
                    <span className={styles.rowTime}>{startText(entry, hourFormat)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card as="section" className={styles.card} aria-labelledby="agenda-filters">
        <h2 id="agenda-filters" className={styles.plainTitle}>
          Mostrar
        </h2>
        <ul className={styles.list}>
          {FILTER_TYPES.map((type) => {
            const on = !hidden.has(type)
            return (
              <li key={type}>
                <button type="button" role="checkbox" aria-checked={on} className={[styles.filter, on ? null : styles.filterOff].filter(Boolean).join(' ')} onClick={() => onToggleFilter(type)}>
                  <span className={[styles.box, on ? styles.boxOn : null].filter(Boolean).join(' ')} aria-hidden="true">
                    {on ? <LineIcon d="M5 12l5 5L20 7" size={14} strokeWidth={2.4} /> : null}
                  </span>
                  <span className={[styles.swatch, types[type]].join(' ')} aria-hidden="true" />
                  <span className={styles.filterLabel}>{TYPE_LABEL[type]}</span>
                  <span className={styles.filterCount}>{counts[type]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
    </aside>
  )
}
