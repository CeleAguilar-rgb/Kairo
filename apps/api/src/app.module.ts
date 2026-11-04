import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AccountModule } from './account/account.module'
import { JwtGuard } from './auth/jwt.guard'
import { DbModule } from './common/db/db.module'
import { SupabaseModule } from './common/supabase/supabase.module'
import { SearchRegistryModule } from './common/search/search.registry'
import { TrashRegistryModule } from './common/trash/trash.registry'
import { JobsModule } from './jobs/jobs.module'
import { AgendaModule } from './modules/agenda/agenda.module'
import { AttachmentsModule } from './modules/attachments/attachments.module'
import { DailyModule } from './modules/daily/daily.module'
import { FinanceModule } from './modules/finance/finance.module'
import { FocusModule } from './modules/focus/focus.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { ProjectsModule } from './modules/projects/projects.module'
import { RemindersModule } from './modules/reminders/reminders.module'
import { SchoolModule } from './modules/school/school.module'
import { SearchModule } from './modules/search/search.module'
import { SprintsModule } from './modules/sprints/sprints.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { TrashModule } from './modules/trash/trash.module'
import { WritingsModule } from './modules/writings/writings.module'

@Module({
  imports: [
    DbModule,
    SupabaseModule,
    TrashRegistryModule,
    SearchRegistryModule,
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
    FocusModule,
    TrashModule,
    SearchModule,
    NotificationsModule,
    JobsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtGuard }],
})
export class AppModule {}
