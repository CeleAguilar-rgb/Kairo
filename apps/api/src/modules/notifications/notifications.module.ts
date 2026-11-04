import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module'
import { NotificationsController } from './notifications.controller'
import { NotificationsRepository } from './notifications.repository'
import { NotificationsService } from './notifications.service'

// Avisos: el panel y Web Push. Exporta su service para las tareas programadas (src/jobs), que son quienes crean los
// avisos. Cuenta le da las horas de silencio del perfil.
@Module({
  imports: [AccountModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
