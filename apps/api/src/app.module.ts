import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AccountModule } from './account/account.module'
import { JwtGuard } from './auth/jwt.guard'
import { DbModule } from './common/db/db.module'
import { SupabaseModule } from './common/supabase/supabase.module'
import { AgendaModule } from './modules/agenda/agenda.module'
import { DailyModule } from './modules/daily/daily.module'
import { RemindersModule } from './modules/reminders/reminders.module'
import { TasksModule } from './modules/tasks/tasks.module'

@Module({
  imports: [DbModule, SupabaseModule, AccountModule, TasksModule, RemindersModule, AgendaModule, DailyModule],
  providers: [{ provide: APP_GUARD, useClass: JwtGuard }],
})
export class AppModule {}
