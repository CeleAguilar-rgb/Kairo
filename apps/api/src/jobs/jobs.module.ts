import { Module } from '@nestjs/common'
import { AccountModule } from '../account/account.module'
import { FinanceModule } from '../modules/finance/finance.module'
import { RemindersModule } from '../modules/reminders/reminders.module'
import { TrashModule } from '../modules/trash/trash.module'
import { JobsController } from './jobs.controller'
import { JobsService } from './jobs.service'

// Tareas programadas: una hoja del grafo de módulos (depende de los que tienen trabajo programado y nadie depende
// de ella).
@Module({
  imports: [AccountModule, RemindersModule, FinanceModule, TrashModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
