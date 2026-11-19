'use client'

import { Segmented } from '@/components/ui/Segmented'

import type { SchoolTab } from '../types'

const TAB_OPTIONS: { value: SchoolTab; label: string }[] = [
  { value: 'schedule', label: 'Horario' },
  { value: 'subjects', label: 'Materias' },
  { value: 'assignments', label: 'Entregas' },
  { value: 'grades', label: 'Calificaciones' },
]

export function TermTabs({
  tab,
  onChange,
}: {
  tab: SchoolTab
  onChange: (tab: SchoolTab) => void
}) {
  return (
    <Segmented
      label="Escuela"
      tone="glass"
      value={tab}
      onChange={onChange}
      options={TAB_OPTIONS}
    />
  )
}
