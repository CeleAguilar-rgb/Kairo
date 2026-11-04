import { z } from 'zod'

// De dónde sale un aviso (`notifications.source_type`): el front elige el ícono con esto (Atajos.dc.html).
export const NOTIFICATION_SOURCES = ['reminder', 'membership', 'budget', 'debt', 'system'] as const
export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number]

// Cuántos días hacia atrás muestra el panel ("Hoy, ayer y antes").
export const NOTIFICATION_DAYS = 14

// Activar los avisos en un navegador: lo que devuelve `PushSubscription.toJSON()` en el navegador. Solo https: un
// endpoint de otro esquema no es un servicio de push de verdad.
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/, message: 'Ese navegador no dio una suscripción válida.' }).max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
})

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>

// Desactivarlos en ese navegador.
export const pushUnsubscribeSchema = pushSubscriptionSchema.pick({ endpoint: true })

export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>
