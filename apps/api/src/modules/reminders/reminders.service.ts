import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { CreateReminderInput, SnoozeReminderInput } from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import type { reminders } from '../../db/schema/reminders'
import { nextOccurrence, snoozeTarget, todayIn, zonedToUtc } from './reminder-utils'
import { RemindersRepository } from './reminders.repository'

type ReminderRow = typeof reminders.$inferSelect

@Injectable()
export class RemindersService {
  constructor(
    @Inject(RemindersRepository) private readonly repository: RemindersRepository,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  async findAll(userId: string) {
    const rows = await this.repository.findUpcoming(userId)
    return rows.map(toReminder)
  }

  async create(userId: string, input: CreateReminderInput) {
    const timeZone = await this.timeZoneOf(userId)
    const remindAt = new Date(zonedToUtc(input.date, input.time, timeZone))
    // Un recordatorio que ya nace atrasado no sirve: nunca avisaría.
    if (remindAt <= new Date()) {
      throw new BadRequestException({
        code: 'REMINDER_IN_PAST',
        message: 'Esa hora ya pasó. Elige una más adelante.',
      })
    }
    const row = await this.repository.create(userId, { title: input.title, remindAt, repeat: input.repeat })
    return toReminder(row)
  }

  // Si se repite, la siguiente vez nace como otra fila (spawnedFromId
  // apuntando a esta): uncomplete() la borra al deshacer.
  async complete(userId: string, id: string) {
    const row = await this.repository.complete(userId, id)
    if (!row) throw this.notFound()

    let next: ReminderRow | undefined
    if (row.repeat !== 'none') {
      const timeZone = await this.timeZoneOf(userId)
      const nextAt = nextOccurrence(row.remindAt.toISOString(), row.repeat, todayIn(timeZone), timeZone)
      if (nextAt) {
        next = await this.repository.create(userId, {
          title: row.title,
          remindAt: new Date(nextAt),
          repeat: row.repeat,
          spawnedFromId: row.id,
        })
      }
    }

    return { reminder: toReminder(row), next: next ? toReminder(next) : null }
  }

  async uncomplete(userId: string, id: string) {
    const row = await this.repository.uncomplete(userId, id)
    if (!row) throw this.notFound()
    return toReminder(row)
  }

  async snooze(userId: string, id: string, input: SnoozeReminderInput) {
    const timeZone = await this.timeZoneOf(userId)
    const snoozedTo = new Date(snoozeTarget(input.until, new Date().toISOString(), timeZone))
    const row = await this.repository.snooze(userId, id, snoozedTo)
    if (!row) throw this.notFound()
    return toReminder(row)
  }

  async unsnooze(userId: string, id: string) {
    const row = await this.repository.unsnooze(userId, id)
    if (!row) throw this.notFound()
    return toReminder(row)
  }

  // Recordatorios necesita la zona del perfil para convertir día+hora a UTC
  // y para calcular la siguiente vez de una serie; se la pide al service de
  // Cuenta (regla de modules.md: nunca lee su tabla directo).
  private async timeZoneOf(userId: string): Promise<string> {
    const { profile } = await this.accountService.getMe(userId)
    return profile.timezone
  }

  private notFound() {
    return new NotFoundException({
      code: 'REMINDER_NOT_FOUND',
      message: 'No encontramos ese recordatorio.',
    })
  }
}

// source y precision siempre fijos: ver decisión #36.
function toReminder(row: ReminderRow) {
  return {
    id: row.id,
    title: row.title,
    remindAt: row.remindAt.toISOString(),
    precision: 'time' as const,
    doneAt: row.doneAt?.toISOString() ?? null,
    snoozedTo: row.snoozedTo?.toISOString() ?? null,
    source: { kind: 'manual' as const, label: '' },
    repeat: row.repeat,
  }
}
