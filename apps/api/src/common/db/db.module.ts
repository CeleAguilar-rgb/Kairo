import { Global, Module } from '@nestjs/common'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'

export const DB = Symbol('DB')

@Global()
@Module({
  providers: [
    {
      provide: DB,
      // prepare: false porque el pooler de Supabase en modo transacción no soporta
      // prepared statements entre conexiones (ver docs/guides/architecture.md, Despliegue).
      useFactory: () => drizzle(postgres(env.DATABASE_URL, { prepare: false })),
    },
  ],
  exports: [DB],
})
export class DbModule {}
