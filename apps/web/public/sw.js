// Service worker de Kairo: solo muestra los avisos del navegador (Web Push) y abre Kairo al picarlos. No guarda nada
// en caché ni intercepta peticiones. Lo registra features/shortcuts/push.ts cuando la persona activa los avisos.
// El aviso lo manda la API (modules/notifications/notifications.service.ts) como { title, body, link }.

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }
  const title = typeof payload.title === 'string' && payload.title ? payload.title : 'Kairo'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === 'string' ? payload.body : '',
      icon: '/kairo-logo/kairo-icono-192.png',
      badge: '/kairo-logo/kairo-icono-192.png',
      data: { link: safeLink(payload.link) },
    }),
  )
})

// Picar el aviso: si Kairo ya está abierto en una pestaña, se usa esa; si no, se abre una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = safeLink(event.notification.data && event.notification.data.link)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      // navigate() solo funciona en pestañas que este worker controla; si no, se abre una nueva.
      if (open) return open.navigate(link).then((client) => (client || open).focus()).catch(() => self.clients.openWindow(link))
      return self.clients.openWindow(link)
    }),
  )
})

// Solo rutas de Kairo ("/recordatorios"), nunca otra página: "//otro.sitio" también empieza con "/".
function safeLink(link) {
  return typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') ? link : '/'
}
