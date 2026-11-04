import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { AppModule } from '../src/app.module'
import { DB } from '../src/common/db/db.module'
import { env } from '../src/common/env'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { JobsService } from '../src/jobs/jobs.service'

// Solo la puerta de las tareas programadas. Correrlas de verdad aquí NO: recorren a todas las personas de la base, y
// los e2e usan la misma base que desarrollo (helpers/test-users.ts), así que anotarían cobros y vaciarían la papelera
// de la cuenta real.
describe('Tareas programadas (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase

  const run = (name: string, secret?: string) => {
    const call = request(app.getHttpServer()).post(`/v1/internal/jobs/${name}`)
    return secret === undefined ? call : call.set('X-Job-Secret', secret)
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()
    db = moduleRef.get(DB)
  })

  afterAll(async () => {
    await app.close()
    await db.$client.end()
  })

  it('Nest arma JobsService con todo lo que necesita', () => {
    // Si falta un @Inject() explícito (el problema de tsx con la metadata, ver docs/history/current.md), esto truena.
    expect(app.get(JobsService)).toBeInstanceOf(JobsService)
  })

  it('sin el header responde 404, como si no existiera', async () => {
    await run('minute').expect(404)
    await run('daily').expect(404)
  })

  it('con un secreto equivocado (o de otro largo) también 404', async () => {
    await run('minute', 'x'.repeat(40)).expect(404)
    await run('minute', 'corto').expect(404)
  })

  it('un token de persona no sirve de secreto', async () => {
    await request(app.getHttpServer()).post('/v1/internal/jobs/minute').set('Authorization', 'Bearer algo').expect(404)
  })

  it('una tarea que no existe es 404 aunque el secreto sea correcto', async () => {
    if (!env.JOB_SECRET) return
    await run('purgar-todo', env.JOB_SECRET).expect(404)
  })
})
