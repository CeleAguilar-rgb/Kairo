import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { eq } from 'drizzle-orm'
// En modo ESM, más seguro importar los globals de Jest en vez de asumirlos
// como globales (recomendación oficial de Jest para tests ESM).
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { AppModule } from '../src/app.module'
import { DB } from '../src/common/db/db.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { profiles } from '../src/db/schema/_shared'
import { createTestUser, deleteTestUser, type TestUser } from './helpers/test-users'

function authHeader(user: TestUser) {
  return { Authorization: `Bearer ${user.accessToken}` }
}

// Crear 2 usuarios reales en Supabase Auth (createTestUser) tarda más que
// el timeout default de un hook (5s): llama a la Admin API dos veces y
// firma sesión dos veces, por red.
jest.setTimeout(30000)

describe('Account (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let userA: TestUser
  let userB: TestUser

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    // Mismo setup que src/main.ts: sin esto, las rutas y el formato de
    // error no coinciden con los de la app real.
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    db = moduleRef.get(DB)
    userA = await createTestUser()
    userB = await createTestUser()

    await request(app.getHttpServer())
      .post('/v1/me/onboarding')
      .set(authHeader(userA))
      .send({ name: 'Ana', avatarPath: 'star', sections: ['tasks'] })
      .expect(201)

    await request(app.getHttpServer())
      .post('/v1/me/onboarding')
      .set(authHeader(userB))
      .send({ name: 'Beto', avatarPath: 'moon', sections: ['finance'] })
      .expect(201)
  })

  afterAll(async () => {
    // Borra el perfil (cascada a user_sections, ver _shared.ts) antes del
    // usuario de auth: no hay FK entre las dos tablas que lo haga sola.
    await db.delete(profiles).where(eq(profiles.id, userA.id))
    await db.delete(profiles).where(eq(profiles.id, userB.id))
    await deleteTestUser(userA.id)
    await deleteTestUser(userB.id)
    await app.close()
    // app.close() no cierra la conexión de Postgres: el provider de DB (DB
    // en db.module.ts) es un factory simple, sin hook de shutdown de Nest.
    await db.$client.end()
  })

  describe('guard global', () => {
    it('rechaza una petición sin token', () => {
      return request(app.getHttpServer()).get('/v1/me').expect(401)
    })

    it('rechaza un token inválido', () => {
      return request(app.getHttpServer())
        .get('/v1/me')
        .set('Authorization', 'Bearer esto-no-es-un-jwt-valido')
        .expect(401)
    })
  })

  describe('aislamiento entre usuarios', () => {
    it('cada quien ve solo su propio perfil', async () => {
      const resA = await request(app.getHttpServer())
        .get('/v1/me')
        .set(authHeader(userA))
        .expect(200)
      expect(resA.body.profile.name).toBe('Ana')

      const resB = await request(app.getHttpServer())
        .get('/v1/me')
        .set(authHeader(userB))
        .expect(200)
      expect(resB.body.profile.name).toBe('Beto')
    })

    it('editar el perfil propio no toca el de otro usuario', async () => {
      await request(app.getHttpServer())
        .patch('/v1/me')
        .set(authHeader(userA))
        .send({ name: 'Ana actualizada', avatarPath: 'star' })
        .expect(200)

      const resB = await request(app.getHttpServer())
        .get('/v1/me')
        .set(authHeader(userB))
        .expect(200)
      expect(resB.body.profile.name).toBe('Beto')
    })

    it('reordenar las propias secciones no toca las de otro usuario', async () => {
      await request(app.getHttpServer())
        .patch('/v1/me/sections')
        .set(authHeader(userA))
        .send({ sections: [{ section: 'tasks', enabled: false, position: 0 }] })
        .expect(200)

      const resB = await request(app.getHttpServer())
        .get('/v1/me')
        .set(authHeader(userB))
        .expect(200)
      const finance = resB.body.sections.find(
        (section: { section: string }) => section.section === 'finance',
      )
      expect(finance?.enabled).toBe(true)
    })
  })

  describe('validación', () => {
    it('rechaza un nombre vacío al actualizar el perfil', () => {
      return request(app.getHttpServer())
        .patch('/v1/me')
        .set(authHeader(userA))
        .send({ name: '', avatarPath: 'star' })
        .expect(400)
    })

    it('rechaza la bienvenida sin ninguna sección elegida', () => {
      return request(app.getHttpServer())
        .post('/v1/me/onboarding')
        .set(authHeader(userB))
        .send({ name: 'Beto', avatarPath: 'moon', sections: [] })
        .expect(400)
    })
  })
})
