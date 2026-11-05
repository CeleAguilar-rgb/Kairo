import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { RemindersController } from './reminders.controller.js'
import { RemindersJobs } from './reminders.jobs.js'
import { RemindersRepository } from './reminders.repository.js'
import { RemindersService } from './reminders.service.js'
import { RemindersTrash } from './reminders.trash.js'
import { RemindersSearch } from './reminders.search.js'

// Exporta RemindersJobs para las tareas programadas (src/jobs): avisar los que ya tocan.
@Module({
  imports: [AccountModule, NotificationsModule],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersRepository, RemindersTrash, RemindersSearch, RemindersJobs],
  exports: [RemindersJobs],
})
export class RemindersModule {}
