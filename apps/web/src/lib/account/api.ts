import 'server-only'
import type { ModuleId } from '@kairo/shared'
import { cache } from 'react'
import { api, ApiError } from '@/lib/api-client'

export type Profile = {
  id: string
  name: string | null
  avatarPath: string | null
  timezone: string
  weekStart: 'monday' | 'sunday'
  hourFormat: '12h' | '24h'
  currency: string
  theme: 'light' | 'dark' | 'system'
  decorationsOn: boolean
  onboardedAt: string | null
}

export type UserSection = {
  section: ModuleId
  enabled: boolean
  position: number
}

export type Me = { profile: Profile; sections: UserSection[] }

// null cuando todavía no hay perfil (antes de terminar la bienvenida):
// apps/api/src/account/account.service.ts responde 404 PROFILE_NOT_FOUND.
// cache(): el layout del dashboard y la página que renderiza pueden pedirlo
// en el mismo request; React lo deduplica en vez de llamar a la API dos veces.
export const getMe = cache(async (): Promise<Me | null> => {
  try {
    return await api.get<Me>('/me')
  } catch (error) {
    if (error instanceof ApiError && error.code === 'PROFILE_NOT_FOUND')
      return null
    throw error
  }
})
