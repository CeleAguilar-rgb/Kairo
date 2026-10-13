import { Global, Module } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import { env } from '../env'

export const SUPABASE_ADMIN = Symbol('SUPABASE_ADMIN')

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN,
      // autoRefreshToken/persistSession en false: este cliente actúa como admin
      // (service role), no como un usuario con sesión propia que haya que mantener.
      useFactory: () =>
        createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        }),
    },
  ],
  exports: [SUPABASE_ADMIN],
})
export class SupabaseModule {}
