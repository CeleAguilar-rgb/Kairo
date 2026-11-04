import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { RemindersController } from './reminders.controller'
import { RemindersJobs } from './reminders.jobs'
import { RemindersRepository } from './reminders.repository'
import { RemindersService } from './reminders.service'
import { RemindersTrash } from './reminders.trash'
import { RemindersSearch } from './reminders.search'

// Exporta RemindersJobs para las tareas programadas (src/jobs): avisar los que ya tocan.
@Module({
  imports: [AccountModule, NotificationsModule],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersRepository, RemindersTrash, RemindersSearch, RemindersJobs],
  exports: [RemindersJobs],
})
export class RemindersModule {}
