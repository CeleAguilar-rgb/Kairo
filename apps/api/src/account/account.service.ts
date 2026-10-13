import { Injectable, NotFoundException } from '@nestjs/common'
import {
  type CompleteOnboardingInput,
  MODULE_IDS,
  type UpdateProfileInput,
  type UpdateSectionsInput,
} from '@kairo/shared'
import { AccountRepository, type SectionRow } from './account.repository'

// No son opciones en el paso 2 de Bienvenida: 'home' siempre está presente,
// y 'reminders'/'focus' son piezas más globales (avisos, pomodoro flotante)
// que entran activas por default. La persona las apaga después si quiere,
// desde "Mis secciones" en Perfil.
const ALWAYS_ENABLED = new Set(['home', 'reminders', 'focus'])

@Injectable()
export class AccountService {
  constructor(private readonly repository: AccountRepository) {}

  // 404 cuando no hay perfil: antes de la bienvenida, profiles.id para este
  // usuario todavía no existe (se crea recién en completeOnboarding). El
  // Shell del front usa este 404 para mandar a /bienvenida.
  async getMe(userId: string) {
    const profile = await this.repository.findProfile(userId)
    if (!profile) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Todavía no completas la bienvenida.',
      })
    }

    const sections = await this.repository.findSections(userId)
    return { profile, sections }
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    await this.repository.updateProfile(userId, input)
    return this.getMe(userId)
  }

  async completeOnboarding(userId: string, input: CompleteOnboardingInput) {
    await this.repository.upsertProfile(userId, {
      name: input.name,
      avatarPath: input.avatarPath,
      onboardedAt: new Date(),
    })

    // Una fila por cada id de MODULE_IDS (no solo los elegidos): así "Mis
    // secciones" en Perfil solo necesita leer y actualizar filas que ya
    // existen, nunca crear una nueva al prender algo que no se eligió aquí.
    // El orden inicial es el de MODULE_IDS; reordenar en Perfil reescribe
    // position con updateSections.
    const rows: SectionRow[] = MODULE_IDS.map((section, position) => ({
      section,
      enabled: ALWAYS_ENABLED.has(section) || input.sections.includes(section),
      position,
    }))

    await this.repository.replaceSections(userId, rows)

    return this.getMe(userId)
  }

  async updateSections(userId: string, input: UpdateSectionsInput) {
    await this.repository.replaceSections(userId, input.sections)
    return this.getMe(userId)
  }
}
