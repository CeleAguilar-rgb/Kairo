import type { NotificationSource, SearchKind } from '@kairo/shared'

// Un resultado de Ctrl+K como lo devuelve la API (`GET /search`): hechos crudos; el texto y el enlace los arma
// search-text.ts.
export type SearchHit = {
  kind: SearchKind
  id: string
  title: string
  detail: string | null
  date: string | null
  amountCents: number | null
  parentId: string | null
}

// Lo que se puede crear con el "+" (Atajos.dc.html).
export type CaptureKind = 'task' | 'event' | 'expense' | 'reminder' | 'note'
export type CaptureWhen = 'today' | 'tomorrow' | 'none'

// Un aviso como lo devuelve la API (`GET /notifications`): los crean las tareas programadas (recordatorios que
// tocan, cobros de membresías, presupuesto). El grupo (Hoy / Ayer / Antes) y el texto los arma notification-text.ts.
export type NotificationItem = {
  id: string
  title: string
  body: string | null
  link: string | null
  sourceType: NotificationSource
  createdAt: string
  readAt: string | null
}

export type NotificationsPanelData = { items: NotificationItem[]; unread: number }
