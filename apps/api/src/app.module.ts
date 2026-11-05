import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AccountModule } from './account/account.module.js'
import { JwtGuard } from './auth/jwt.guard.js'
import { DbModule } from './common/db/db.module.js'
import { SupabaseModule } from './common/supabase/supabase.module.js'
import { SearchRegistryModule } from './common/search/search.registry.js'
import { TrashRegistryModule } from './common/trash/trash.registry.js'
import { JobsModule } from './jobs/jobs.module.js'
import { AgendaModule } from './modules/agenda/agenda.module.js'
import { AttachmentsModule } from './modules/attachments/attachments.module.js'
import { DailyModule } from './modules/daily/daily.module.js'
import { FinanceModule } from './modules/finance/finance.module.js'
import { FocusModule } from './modules/focus/focus.module.js'
import { NotificationsModule } from './modules/notifications/notifications.module.js'
import { ProjectsModule } from './modules/projects/projects.module.js'
import { RemindersModule } from './modules/reminders/reminders.module.js'
import { SchoolModule } from './modules/school/school.module.js'
import { SearchModule } from './modules/search/search.module.js'
import { SprintsModule } from './modules/sprints/sprints.module.js'
import { TasksModule } from './modules/tasks/tasks.module.js'
import { TrashModule } from './modules/trash/trash.module.js'
import { WritingsModule } from './modules/writings/writings.module.js'

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
