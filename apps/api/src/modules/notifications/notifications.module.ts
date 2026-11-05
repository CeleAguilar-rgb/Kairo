import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module.js'
import { NotificationsController } from './notifications.controller.js'
import { NotificationsRepository } from './notifications.repository.js'
import { NotificationsService } from './notifications.service.js'

// Avisos: el panel y Web Push. Exporta su service para las tareas programadas (src/jobs), que son quienes crean los
// avisos. Cuenta le da las horas de silencio del perfil.
@Module({
  imports: [AccountModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
