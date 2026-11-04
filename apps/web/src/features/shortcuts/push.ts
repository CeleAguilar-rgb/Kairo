'use client'

import { env } from '@/lib/env'

import { subscribePushAction, unsubscribePushAction } from './notification-actions'

// Los avisos del navegador (Web Push). El navegador se suscribe con la llave pública de la API, y la suscripción
// (una dirección del servicio de push de ese navegador + dos llaves) se guarda en la API, que es quien manda los
// avisos. public/sw.js los muestra aunque Kairo esté cerrado.
//   unsupported: el navegador no sabe, o falta la llave pública.   denied: la persona bloqueó los avisos del sitio.
export type PushState = 'unsupported' | 'denied' | 'on' | 'off'
export type PushResult = { ok: true; state: PushState } | { ok: false; message: string }

const SERVICE_WORKER = '/sw.js'

function supported() {
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER)
  return (await registration?.pushManager.getSubscription()) ?? null
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return (await currentSubscription()) ? 'on' : 'off'
}

export async function enablePush(): Promise<PushResult> {
  if (!supported()) return { ok: true, state: 'unsupported' }
  // El navegador pregunta aquí, con el clic de la persona (sin clic, varios navegadores ni preguntan).
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: true, state: permission === 'denied' ? 'denied' : 'off' }

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER)
    await navigator.serviceWorker.ready
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }))
    const saved = await subscribePushAction(subscription.toJSON())
    if (!saved.ok) {
      // Si la API no la guardó, no sirve de nada tenerla en el navegador: se quita para no mentir con el "activado".
      await subscription.unsubscribe()
      return saved
    }
    return { ok: true, state: 'on' }
  } catch {
    return { ok: false, message: 'Este navegador no pudo activar los avisos. Intenta de nuevo.' }
  }
}

export async function disablePush(): Promise<PushResult> {
  const subscription = await currentSubscription()
  if (!subscription) return { ok: true, state: 'off' }
  const removed = await unsubscribePushAction({ endpoint: subscription.endpoint })
  if (!removed.ok) return removed
  await subscription.unsubscribe()
  return { ok: true, state: 'off' }
}

// La llave VAPID viene en base64 "para URL" (- y _ en vez de + y /, sin =); PushManager la pide en bytes.
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index)
  return bytes
}
