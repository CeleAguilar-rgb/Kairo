import type { ModuleManifest } from '@/lib/modules/registry'

export const financeModule: ModuleManifest = {
  id: 'finance',
  label: 'Finanzas',
  href: '/finanzas',
  icon: [
    'M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7z',
    'M4 7l11-3v3',
    'M14.8 13.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0',
  ],
}
