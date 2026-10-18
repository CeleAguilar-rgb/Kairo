import type { ModuleManifest } from '@/lib/modules/registry'

// Fuera de la barra de secciones: el nav del canvas (Main.dc.html) tiene 7
// secciones y Escuela no está entre ellas; con 8 ya no cabe junto a los
// íconos en pantallas medianas. Su ruta sigue existiendo.
export const schoolModule: ModuleManifest = {
  id: 'school',
  label: 'Escuela',
  href: '/escuela',
  icon: ['M3 9l9-5 9 5-9 5-9-5z', 'M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5'],
  inNav: false,
}
