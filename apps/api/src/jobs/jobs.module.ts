import { Module } from '@nestjs/common'
import { AccountModule } from '../account/account.module.js'
import { FinanceModule } from '../modules/finance/finance.module.js'
import { RemindersModule } from '../modules/reminders/reminders.module.js'
import { TrashModule } from '../modules/trash/trash.module.js'
import { JobsController } from './jobs.controller.js'
import { JobsService } from './jobs.service.js'

// Tareas programadas: una hoja del grafo de módulos (depende de los que tienen trabajo programado y nadie depende
// de ella).
@Module({
  imports: [AccountModule, RemindersModule, FinanceModule, TrashModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
