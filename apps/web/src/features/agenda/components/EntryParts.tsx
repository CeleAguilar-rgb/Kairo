import type { CSSProperties } from 'react'

import { LineIcon } from '@/components/ui/Card'

import type { AgendaEntry } from '../types'

import styles from './EntryParts.module.css'
import types from './entry-types.module.css'

// Un renglón de lo que dura todo el día (un cobro, una tarea con fecha, un evento de todo el día): una
// píldora de su color, con un icono si es pago o tarea.
export function EntryChip({ entry, selected, onSelect }: { entry: AgendaEntry; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      className={[styles.chip, types[entry.type], selected ? styles.selected : null].filter(Boolean).join(' ')}
      aria-pressed={selected}
      onClick={() => onSelect(entry.id)}
    >
      {entry.type === 'payment' ? (
        <LineIcon d={['M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7z', 'M4 7l11-3v3']} size={14} />
      ) : entry.type === 'task' ? (
        <LineIcon d={['M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8.5 12l2.5 2.5 4.5-5']} size={14} />
      ) : null}
      <span className={styles.chipText}>{entry.title}</span>
    </button>
  )
}

type EntryBlockProps = {
  entry: AgendaEntry
  selected: boolean
  // La hora de la entrada ya con formato ("11:00 a 11:45")
  time: string
  // Alto en px: decide qué se alcanza a mostrar (la hora, la nota)
  height: number
  // Se muestra la nota cuando el bloque es alto (la vista de día)
  showNote?: boolean
  style: CSSProperties
  onSelect: (id: string) => void
}

// Un evento con hora, puesto en la cuadrícula del día o de la semana.
export function EntryBlock({ entry, selected, time, height, showNote = false, style, onSelect }: EntryBlockProps) {
  return (
    <button
      type="button"
      className={[styles.block, types[entry.type], selected ? styles.selected : null, height < 44 ? styles.short : null].filter(Boolean).join(' ')}
      style={style}
      aria-label={`${entry.title}, ${time}`}
      aria-pressed={selected}
      onClick={() => onSelect(entry.id)}
    >
      <span className={[styles.blockTitle, height < 96 ? styles.nowrap : null].filter(Boolean).join(' ')}>{entry.title}</span>
      {height >= 52 ? <span className={styles.blockTime}>{time}</span> : null}
      {showNote && entry.notes && height >= 80 ? <span className={styles.blockNote}>{entry.notes}</span> : null}
    </button>
  )
}
