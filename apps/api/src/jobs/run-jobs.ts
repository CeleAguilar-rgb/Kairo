import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { JOB_NAMES, type JobName, JobsService } from './jobs.service'

// Correr una tarea programada a mano, sin Supabase Cron (en desarrollo): `pnpm jobs:run minute` o `pnpm jobs:run daily`.
async function main() {
  const name = process.argv[2] as JobName
  if (!JOB_NAMES.includes(name)) {
    console.error(`Uso: pnpm jobs:run <${JOB_NAMES.join(' | ')}>`)
    process.exit(1)
  }
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] })
  try {
    console.log(JSON.stringify(await app.get(JobsService).run(name), null, 2))
  } finally {
    await app.close()
  }
}

main()
