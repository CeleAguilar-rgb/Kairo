import { Inject, Injectable } from '@nestjs/common'
import { NotificationsService } from '../notifications/notifications.service'
import { RemindersRepository } from './reminders.repository'

const HOUR_MS = 60 * 60 * 1000
// Un lote por minuto (architecture.md: "lotes pequeños"). Si quedan más, los toma la siguiente vuelta.
const BATCH = 200

// API pública de Recordatorios para las tareas programadas (src/jobs).
@Injectable()
export class RemindersJobs {
  constructor(
    @Inject(RemindersRepository) private readonly repository: RemindersRepository,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  // Cada minuto: los recordatorios que ya tocan → aviso. Idempotente por dos lados: la clave del aviso lleva la hora a
  // la que tocaba (dos vueltas a la vez no lo duplican; posponerlo da otra hora y otro aviso) y `notifiedAt` lo saca de
  // la siguiente búsqueda.
  async notifyDue(now = new Date()): Promise<number> {
    const due = await this.repository.findDue(now, new Date(now.getTime() - 24 * HOUR_MS), BATCH)
    let sent = 0
    for (const reminder of due) {
      const created = await this.notificationsService.notify(
        reminder.userId,
        {
          title: reminder.title,
          body: null,
          link: '/recordatorios',
          sourceType: 'reminder',
          sourceId: reminder.id,
          dedupeKey: `reminder:${reminder.id}:${reminder.dueAt.toISOString()}`,
        },
        now,
      )
      if (created) sent++
    }
    await this.repository.markNotified(
      due.map((reminder) => reminder.id),
      now,
    )
    return sent
  }
}
