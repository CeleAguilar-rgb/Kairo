import type { ModuleManifest } from '@/lib/modules/registry'

// No va en la barra de secciones (en el canvas se llega desde su tarjeta de
// Inicio y desde el panel de avisos), pero sí tiene su ruta.
export const remindersModule: ModuleManifest = {
  id: 'reminders',
  label: 'Recordatorios',
  href: '/recordatorios',
  icon: ['M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  inNav: false,
}
