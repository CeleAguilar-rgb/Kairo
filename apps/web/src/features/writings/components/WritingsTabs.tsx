'use client'

import { usePathname } from 'next/navigation'

import { usePendingHref } from '@/components/layout/Navigation'
import { IconTabs, type IconTabItem } from '@/components/ui/IconTabs'

const BASE = '/escritos'

const TABS = [
  { key: 'books', href: BASE, label: 'Historias', icon: ['M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z', 'M5 18a2 2 0 0 1 2-2h12'] },
  { key: 'notes', href: `${BASE}/notas`, label: 'Notas', icon: ['M6 3h9l4 4v14H6z', 'M14 3v5h5'] },
  { key: 'characters', href: `${BASE}/personajes`, label: 'Personajes', icon: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'] },
  {
    key: 'worlds',
    href: `${BASE}/mundos`,
    label: 'Mundos',
    icon: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M3 12h18', 'M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z'],
  },
] as const

export type WritingsTabCounts = { books: number; notes: number; characters: number; worlds: number }

// Las cuatro partes de Escritos como pestañas que son rutas (igual que las de Finanzas y Día a día): cada una
// tiene su URL, así que el botón "atrás" y los enlaces directos funcionan. La píldora oscura se desliza a la
// pestaña elegida, y se mueve al hacer clic sin esperar a que llegue la página (usePendingHref). En el
// teléfono las que no están elegidas se reducen a su icono (ver IconTabs.tsx).
export function WritingsTabs({ counts }: { counts: WritingsTabCounts }) {
  const pathname = usePathname()
  const target = usePendingHref() ?? pathname
  const items: IconTabItem[] = TABS.map((tab) => ({ ...tab, icon: [...tab.icon], count: counts[tab.key] }))
  const active = TABS.find((tab) => tab.href !== BASE && target.startsWith(tab.href)) ?? TABS[0]

  return <IconTabs id="writings-tabs" label="Escritos" items={items} activeKey={active.key} />
}
