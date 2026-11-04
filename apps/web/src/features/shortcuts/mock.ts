import type { NotificationItem, NotificationsPanelData, SearchHit } from './types'

// Los resultados de ejemplo de Atajos.dc.html, para el modo demo (ids de ejemplo: los enlaces llevan a la sección).
export const DEMO_HITS: SearchHit[] = [
  { kind: 'task', id: 'demo-s-t1', title: 'Revisar requisitos de inscripción', detail: 'todo', date: null, amountCents: null, parentId: null },
  { kind: 'event', id: 'demo-s-e1', title: 'Revisar inscripción', detail: '1020', date: '2026-10-14', amountCents: null, parentId: null },
  { kind: 'goal', id: 'demo-s-g1', title: 'Entrar a la ingeniería', detail: 'active', date: null, amountCents: null, parentId: null },
  { kind: 'task', id: 'demo-s-t2', title: 'Terminar el diseño del dashboard', detail: 'in_progress', date: null, amountCents: null, parentId: null },
  { kind: 'transaction', id: 'demo-s-m1', title: 'Súper de la semana', detail: 'expense', date: '2026-10-05', amountCents: 118000, parentId: null },
]

// Los avisos de ejemplo de Atajos.dc.html (los que el producto sí crea: recordatorios, membresías y presupuesto),
// fechados alrededor de ahora para que caigan en "Hoy" y "Ayer".
export function buildDemoNotifications(now = new Date()): NotificationsPanelData {
  const ago = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
  const items: NotificationItem[] = [
    { id: '00000000-0000-4000-8000-000000000001', title: 'No has tomado agua', body: null, link: '/recordatorios', sourceType: 'reminder', createdAt: ago(0.2), readAt: null },
    { id: '00000000-0000-4000-8000-000000000002', title: 'Te pasaste del presupuesto de Comida fuera', body: '$2,340 de $2,000 este mes.', link: '/finanzas/presupuesto', sourceType: 'budget', createdAt: ago(1), readAt: null },
    { id: '00000000-0000-4000-8000-000000000003', title: 'Daily en 10 minutos', body: null, link: '/recordatorios', sourceType: 'reminder', createdAt: ago(2), readAt: ago(1.5) },
    { id: '00000000-0000-4000-8000-000000000004', title: 'Mañana se cobra Spotify', body: '$129 de tu membresía.', link: '/finanzas/membresias', sourceType: 'membership', createdAt: ago(26), readAt: ago(20) },
  ]
  return { items, unread: items.filter((item) => !item.readAt).length }
}
