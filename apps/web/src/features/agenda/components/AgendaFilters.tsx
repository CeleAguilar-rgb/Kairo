import { FilterOptions, FilterSheet } from '@/components/ui/FilterSheet'
import responsive from '@/components/ui/responsive.module.css'

import { FILTER_TYPES, TYPE_LABEL } from '../agenda-utils'
import type { AgendaEntryType } from '../types'

import styles from './AgendaFilters.module.css'
import types from './entry-types.module.css'

type AgendaFiltersProps = {
  counts: Record<AgendaEntryType, number>
  hidden: Set<AgendaEntryType>
  onToggle: (type: AgendaEntryType) => void
}

// "Mostrar" en el teléfono: un botón "Filtrar" en la barra de controles que abre un cajón con los tipos, para decidir
// qué ver (en la compu es la tarjeta "Mostrar" del panel de la derecha, y este botón se oculta). Mismo estado y mismos
// tipos que ella; el número del botón es cuántos tipos están apagados.
export function AgendaFilters({ counts, hidden, onToggle }: AgendaFiltersProps) {
  return (
    <FilterSheet title="Mostrar en el calendario" badge={hidden.size} className={responsive.phoneOnly}>
      <FilterOptions
        label="Mostrar"
        mode="multi"
        options={FILTER_TYPES.map((type) => ({
          value: type,
          label: TYPE_LABEL[type],
          count: counts[type],
          leading: <span className={[styles.swatch, types[type]].join(' ')} aria-hidden="true" />,
        }))}
        isSelected={(value) => !hidden.has(value as AgendaEntryType)}
        onSelect={(value) => onToggle(value as AgendaEntryType)}
      />
    </FilterSheet>
  )
}
