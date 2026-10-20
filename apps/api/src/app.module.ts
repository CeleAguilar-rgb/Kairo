import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AccountModule } from './account/account.module'
import { JwtGuard } from './auth/jwt.guard'
import { DbModule } from './common/db/db.module'
import { SupabaseModule } from './common/supabase/supabase.module'
import { AgendaModule } from './modules/agenda/agenda.module'
import { DailyModule } from './modules/daily/daily.module'
import { FinanceModule } from './modules/finance/finance.module'
import { ProjectsModule } from './modules/projects/projects.module'
import { RemindersModule } from './modules/reminders/reminders.module'
import { SchoolModule } from './modules/school/school.module'
import { SprintsModule } from './modules/sprints/sprints.module'
import { TasksModule } from './modules/tasks/tasks.module'

@Module({
  imports: [
    DbModule,
    SupabaseModule,
    AccountModule,
    ProjectsModule,
    TasksModule,
    SprintsModule,
    RemindersModule,
    AgendaModule,
    DailyModule,
    FinanceModule,
    SchoolModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtGuard }],
})
export class AppModule {}
