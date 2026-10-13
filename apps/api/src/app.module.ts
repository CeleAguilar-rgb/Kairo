import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AccountModule } from './account/account.module'
import { JwtGuard } from './auth/jwt.guard'
import { DbModule } from './common/db/db.module'
import { SupabaseModule } from './common/supabase/supabase.module'

@Module({
  imports: [DbModule, SupabaseModule, AccountModule],
  providers: [{ provide: APP_GUARD, useClass: JwtGuard }],
})
export class AppModule {}
