'use server'

import { pushSubscriptionSchema, pushUnsubscribeSchema } from '@kairo/shared'
import { z } from 'zod'

import { api, ApiError } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'

import { buildDemoNotifications } from './mock'
import type { NotificationsPanelData } from './types'

// El panel de la campana (Atajos.dc.html) y activar los avisos del navegador. Una Server Action es un endpoint
// público: lo que llega se vuelve a validar con el esquema compartido (regla 4) y la API solo toca los avisos de la
// persona del token (reglas 2 y 3). No se revalida ninguna página: el panel lleva su propio estado.
export type NotificationsActionResult<T = void> = { ok: true; data: T } | { ok: false; message: string }

const DEMO_MESSAGE = 'En el modo demo no se guarda nada: es solo para mirar.'

async function run<T>(fallback: string, call: () => Promise<T>): Promise<NotificationsActionResult<T>> {
  try {
    return { ok: true, data: await call() }
  } catch (error) {
    return { ok: false, message: error instanceof ApiError ? error.message : fallback }
  }
}

export async function listNotificationsAction(): Promise<NotificationsActionResult<NotificationsPanelData>> {
  if (DEMO_MODE) return { ok: true, data: buildDemoNotifications() }
  return run('No pudimos cargar tus avisos.', () => api.get<NotificationsPanelData>('/notifications'))
}

export async function markNotificationReadAction(id: unknown): Promise<NotificationsActionResult> {
  const parsed = z.uuid().safeParse(id)
  if (!parsed.success) return { ok: false, message: 'No encontramos ese aviso.' }
  if (DEMO_MODE) return { ok: true, data: undefined }
  return run('No pudimos marcarlo como leído.', async () => {
    await api.post(`/notifications/${parsed.data}/read`, {})
  })
}

export async function markAllNotificationsReadAction(): Promise<NotificationsActionResult> {
  if (DEMO_MODE) return { ok: true, data: undefined }
  return run('No pudimos marcarlos como leídos.', async () => {
    await api.post('/notifications/read-all', {})
  })
}

// Lo que da `PushSubscription.toJSON()` en el navegador.
export async function subscribePushAction(raw: unknown): Promise<NotificationsActionResult> {
  const parsed = pushSubscriptionSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, message: 'Este navegador no dio una suscripción válida.' }
  if (DEMO_MODE) return { ok: false, message: DEMO_MESSAGE }
  return run('No pudimos activar los avisos.', async () => {
    await api.post('/notifications/push-subscriptions', parsed.data)
  })
}

export async function unsubscribePushAction(raw: unknown): Promise<NotificationsActionResult> {
  const parsed = pushUnsubscribeSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, message: 'No pudimos desactivar los avisos.' }
  if (DEMO_MODE) return { ok: false, message: DEMO_MESSAGE }
  return run('No pudimos desactivar los avisos.', async () => {
    await api.delete('/notifications/push-subscriptions', parsed.data)
  })
}
