import type { TrashItem } from './types'

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

// Las cinco cosas de Papelera.dc.html, para el modo demo.
export function buildTrash(): TrashItem[] {
  return [
    { kind: 'project', id: 'demo-trash-p1', group: 'project', name: 'Bot de marketing', detail: 'work', amountCents: null, deletedAt: daysAgo(0), contents: [{ kind: 'task', count: 4 }] },
    { kind: 'task', id: 'demo-trash-t1', group: 'task', name: 'Comprar despensa del meal prep', detail: null, amountCents: null, deletedAt: daysAgo(3), contents: [] },
    { kind: 'page', id: 'demo-trash-c1', group: 'writing', name: 'Borrador del baile', detail: 'chapter', amountCents: null, deletedAt: daysAgo(9), contents: [] },
    { kind: 'membership', id: 'demo-trash-m1', group: 'finance', name: 'Xbox Game Pass', detail: '4417', amountCents: 22900, deletedAt: daysAgo(12), contents: [] },
    { kind: 'transaction', id: 'demo-trash-g1', group: 'finance', name: 'Café de la tarde', detail: 'expense', amountCents: 6500, deletedAt: daysAgo(26), contents: [] },
  ]
}
