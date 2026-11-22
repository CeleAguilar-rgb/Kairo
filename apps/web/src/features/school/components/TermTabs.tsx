'use client'

import { IconTabs, type IconTabItem } from '@/components/ui/IconTabs'

import type { SchoolTab } from '../types'

const TABS: (IconTabItem & { key: SchoolTab })[] = [
  { key: 'schedule', label: 'Horario', icon: ['M3 5h18v16H3z', 'M3 10h18M8 3v4M16 3v4'] },
  { key: 'subjects', label: 'Materias', icon: ['M12 4L2 9l10 5 10-5z', 'M6 11.5V16c0 1 2.7 3 6 3s6-2 6-3v-4.5'] },
  { key: 'assignments', label: 'Entregas', icon: ['M4 4h16v16H4z', 'M8.5 12l2.5 2.5 4.5-5'] },
  { key: 'grades', label: 'Calificaciones', shortLabel: 'Notas', icon: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z' },
]

// Las cuatro partes de Escuela. No son rutas sino botones: el estado vive en SchoolView. En el teléfono las que
// no están elegidas se reducen a su icono (ver IconTabs.tsx).
export function TermTabs({
  tab,
  onChange,
}: {
  tab: SchoolTab
  onChange: (tab: SchoolTab) => void
}) {
  return <IconTabs id="school-tabs" label="Escuela" items={TABS} activeKey={tab} onSelect={(key) => onChange(key as SchoolTab)} />
}
