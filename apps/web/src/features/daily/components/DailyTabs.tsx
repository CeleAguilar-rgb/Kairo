'use client'

import { usePathname } from 'next/navigation'

import { usePendingHref } from '@/components/layout/Navigation'
import { IconTabs, type IconTabItem } from '@/components/ui/IconTabs'

const BASE = '/dia-a-dia'

const TABS: IconTabItem[] = [
  {
    key: 'hoy',
    href: BASE,
    label: 'Hoy',
    icon: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M12 2v2M12 20v2M2 12h2M20 12h2', 'M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  },
  { key: 'menu', href: `${BASE}/menu`, label: 'Menú', icon: ['M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10', 'M17 21V3c-2.5 1.5-3 4-3 7s1 4 3 4'] },
  { key: 'reporte', href: `${BASE}/reporte`, label: 'Reporte', icon: 'M5 20V11M12 20V4M19 20v-6' },
  { key: 'diario', href: `${BASE}/diario`, label: 'Diario', icon: ['M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z', 'M5 18a2 2 0 0 1 2-2h12'] },
  { key: 'metas', href: `${BASE}/metas`, label: 'Metas', icon: 'M5 21V4M5 4h11l-2 4 2 4H5' },
]

// Las cinco partes de Día a día como pestañas que son rutas (igual que las de Finanzas): cada una tiene
// su URL, así que el botón "atrás" y los enlaces directos funcionan. La píldora oscura se desliza a la
// pestaña elegida, y se mueve al hacer clic sin esperar a que llegue la página (usePendingHref). En el
// teléfono las que no están elegidas se reducen a su icono (ver IconTabs.tsx).
export function DailyTabs() {
  const pathname = usePathname()
  const target = usePendingHref() ?? pathname
  const active = TABS.find((tab) => tab.href !== BASE && target.startsWith(tab.href!)) ?? TABS[0]

  return <IconTabs id="daily-tabs" label="Día a día" items={TABS} activeKey={active.key} />
}
