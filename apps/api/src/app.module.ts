import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AccountModule } from './account/account.module'
import { JwtGuard } from './auth/jwt.guard'
import { DbModule } from './common/db/db.module'
import { SupabaseModule } from './common/supabase/supabase.module'
import { AgendaModule } from './modules/agenda/agenda.module'
import { AttachmentsModule } from './modules/attachments/attachments.module'
import { DailyModule } from './modules/daily/daily.module'
import { FinanceModule } from './modules/finance/finance.module'
import { ProjectsModule } from './modules/projects/projects.module'
import { RemindersModule } from './modules/reminders/reminders.module'
import { SchoolModule } from './modules/school/school.module'
import { SprintsModule } from './modules/sprints/sprints.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { WritingsModule } from './modules/writings/writings.module'

@Module({
  imports: [
    DbModule,
    SupabaseModule,
    AccountModule,
    ProjectsModule,
    AttachmentsModule,
    TasksModule,
    SprintsModule,
    RemindersModule,
    AgendaModule,
    DailyModule,
    FinanceModule,
    SchoolModule,
    WritingsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtGuard }],
})
export class AppModule {}
