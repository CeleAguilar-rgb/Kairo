// Doodles de perfil: catálogo fijo, no hay subida de imagen todavía (ver
// packages/shared/src/account/schemas.ts). Compartido entre Bienvenida, el
// Topnav y Perfil para no repetir los mismos paths tres veces.
export const AVATARS = [
  {
    id: 'star',
    name: 'Estrella',
    path: 'M20 6l3.6 8.2 8.9.8-6.7 5.9 2 8.7L20 25l-7.8 4.6 2-8.7-6.7-5.9 8.9-.8L20 6z',
    fill: 'var(--accent)',
  },
  {
    id: 'heart',
    name: 'Corazón',
    path: 'M20 32s-11-7-11-15a6 6 0 0 1 11-3.4A6 6 0 0 1 31 17c0 8-11 15-11 15z',
    fill: 'var(--accent-soft)',
  },
  {
    id: 'sun',
    name: 'Sol',
    path: 'M20 13a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
    fill: 'var(--accent-warm)',
  },
  {
    id: 'bolt',
    name: 'Rayo',
    path: 'M22 4L10 22h9l-2 14 12-18h-9l2-14z',
    fill: 'var(--accent-warm)',
  },
  {
    id: 'moon',
    name: 'Luna',
    path: 'M30 24A11 11 0 0 1 16 10a11 11 0 1 0 14 14z',
    fill: 'var(--accent)',
  },
] as const

export function getAvatar(id: string | null | undefined) {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0]
}
