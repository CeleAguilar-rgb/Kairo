import type { Me } from '@/lib/account/api'

// Perfil de ejemplo del modo demo (lib/demo.ts): todas las secciones prendidas
// para ver todas las tarjetas de Inicio. Solo lo usa getMe() cuando DEMO_MODE.
export const DEMO_ME: Me = {
  profile: {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Celeste',
    avatarPath: 'star',
    timezone: 'America/Mexico_City',
    weekStart: 'monday',
    hourFormat: '24h',
    currency: 'MXN',
    theme: 'light',
    decorationsOn: true,
    onboardedAt: '2026-10-01T00:00:00.000Z',
  },
  sections: (['home', 'tasks', 'projects', 'agenda', 'finance', 'writings', 'daily', 'school', 'reminders', 'focus'] as const).map(
    (section, position) => ({ section, enabled: true, position }),
  ),
}
