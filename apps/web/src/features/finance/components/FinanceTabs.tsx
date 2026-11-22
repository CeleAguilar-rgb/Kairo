'use client'

import { usePathname } from 'next/navigation'

import { usePendingHref } from '@/components/layout/Navigation'
import { IconTabs, type IconTabItem } from '@/components/ui/IconTabs'

const BASE = '/finanzas'

const TABS: IconTabItem[] = [
  { key: 'resumen', href: BASE, label: 'Resumen', icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z' },
  { key: 'movimientos', href: `${BASE}/movimientos`, label: 'Movimientos', icon: 'M7 20V4M7 4L4 7M7 4l3 3M17 4v16M17 20l-3-3M17 20l3-3' },
  {
    key: 'ahorros',
    href: `${BASE}/ahorros`,
    label: 'Ahorros y deudas',
    shortLabel: 'Ahorros',
    icon: ['M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z', 'M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6'],
  },
  { key: 'membresias', href: `${BASE}/membresias`, label: 'Membresías', icon: ['M17 2l4 4-4 4', 'M3 11V9a3 3 0 0 1 3-3h15', 'M7 22l-4-4 4-4', 'M21 13v2a3 3 0 0 1-3 3H3'] },
  { key: 'presupuesto', href: `${BASE}/presupuesto`, label: 'Presupuesto', icon: ['M12 3v9h9a9 9 0 1 1-9-9z', 'M15 3.5A9 9 0 0 1 20.5 9H15z'] },
]

// Las cinco partes de Finanzas como pestañas que son rutas (igual que las de Día a día): cada una tiene su URL,
// así que el botón "atrás" y los enlaces directos funcionan. La píldora oscura se desliza a la pestaña elegida,
// y se mueve al hacer clic sin esperar a que llegue la página (usePendingHref). En el teléfono las que no están
// elegidas se reducen a su icono (ver IconTabs.tsx).
export function FinanceTabs() {
  const pathname = usePathname()
  const target = usePendingHref() ?? pathname
  const active = TABS.find((tab) => tab.href !== BASE && target.startsWith(tab.href!)) ?? TABS[0]

  return <IconTabs id="finance-tabs" label="Finanzas" items={TABS} activeKey={active.key} />
}
