import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module'
import { RemindersController } from './reminders.controller'
import { RemindersRepository } from './reminders.repository'
import { RemindersService } from './reminders.service'

@Module({
  imports: [AccountModule],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersRepository],
})
export class RemindersModule {}
