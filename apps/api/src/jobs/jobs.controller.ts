import { timingSafeEqual } from 'node:crypto'
import { Controller, Headers, HttpCode, Inject, NotFoundException, Param, Post } from '@nestjs/common'
import { Public } from '../auth/public.decorator.js'
import { env } from '../common/env.js'
import { JOB_NAMES, type JobName, JobsService } from './jobs.service.js'

// Endpoints internos que dispara Supabase Cron (architecture.md, "Tareas programadas"). No llevan token de
// persona (@Public): los protege el header X-Job-Secret. Sin JOB_SECRET configurado, con el header incorrecto o con
// un nombre que no existe, responden 404, como si no existieran.
@Public()
@Controller('internal/jobs')
export class JobsController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Post(':name')
  @HttpCode(200)
  run(@Param('name') name: string, @Headers('x-job-secret') secret: string | undefined) {
    if (!isJobSecret(secret) || !JOB_NAMES.includes(name as JobName)) throw new NotFoundException()
    return this.jobsService.run(name as JobName)
  }
}

// Comparación de tiempo constante: con un `===`, cuánto tarda en responder delata cuántos caracteres del inicio
// acertaste.
function isJobSecret(secret: string | undefined): boolean {
  if (!env.JOB_SECRET || !secret) return false
  const expected = Buffer.from(env.JOB_SECRET)
  const given = Buffer.from(secret)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
