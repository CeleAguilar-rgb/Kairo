import { ChipRow } from '@/components/ui/ChipRow'

import { FILTER_TYPES, TYPE_LABEL } from '../agenda-utils'
import type { AgendaEntryType } from '../types'

import styles from './AgendaFilters.module.css'
import types from './entry-types.module.css'

type AgendaFiltersProps = {
  counts: Record<AgendaEntryType, number>
  hidden: Set<AgendaEntryType>
  onToggle: (type: AgendaEntryType) => void
}

// "Mostrar" en el teléfono: una fila de chips arriba del calendario, para decidir qué ver antes de mirarlo (en la
// compu es la tarjeta "Mostrar" del panel de la derecha, y esta fila se oculta). Mismo estado y mismos tipos que ella.
export function AgendaFilters({ counts, hidden, onToggle }: AgendaFiltersProps) {
  return (
    <ChipRow className={styles.row} role="group" aria-label="Mostrar en el calendario">
      {FILTER_TYPES.map((type) => {
        const on = !hidden.has(type)
        return (
          <button
            key={type}
            type="button"
            role="checkbox"
            aria-checked={on}
            className={[styles.chip, on ? styles.chipOn : null].filter(Boolean).join(' ')}
            onClick={() => onToggle(type)}
          >
            <span className={[styles.swatch, types[type]].join(' ')} aria-hidden="true" />
            {TYPE_LABEL[type]}
            <span className={styles.count}>{counts[type]}</span>
          </button>
        )
      })}
    </ChipRow>
  )
}
