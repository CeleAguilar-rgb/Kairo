import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { createClient } from '@supabase/supabase-js'
import { AppModule } from '../src/app.module'
import { env } from '../src/common/env'
import { DB } from '../src/common/db/db.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { StorageService } from '../src/common/storage/storage.service'
import { profiles } from '../src/db/schema/_shared'
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from './helpers/test-users'

// El "navegador" de este test: un cliente de Storage normal (no pasa por la API) que recibe una
// ruta y un token ya firmados y sube los bytes, igual que `uploadToSignedUrl` del SDK en el navegador.
const storageClient = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
}).storage.from(env.SUPABASE_STORAGE_BUCKET)

function authHeader(user: TestUser) {
  return { Authorization: `Bearer ${user.accessToken}` }
}

// Crear usuarios reales en Supabase Auth tarda más que el timeout default de un hook.
jest.setTimeout(30000)

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

const newProject = (overrides: Record<string, unknown> = {}) => ({
  name: 'Dashboard personal',
  kind: 'personal',
  status: 'active',
  description: '',
  startedOn: null,
  goalOn: null,
  objectives: [],
  links: [],
  cover: 'luna',
  ...overrides,
})

type ProjectJson = {
  id: string
  coverPath: string | null
  coverUrl: string | null
}
type AttachmentJson = {
  id: string
  name: string
  kind: string
  sizeBytes: number
  uploadedOn: string
}
type SignedUpload = { path: string; token: string }

describe('Archivos y portada (Storage, e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let storage: StorageService
  let userA: TestUser
  let userB: TestUser
  // Rutas reales subidas a Storage durante la corrida, para limpiarlas al final (afterAll): borrar
  // el usuario de prueba no borra sus objetos de Storage, son sistemas separados.
  const uploadedPaths: string[] = []

  const get = (user: TestUser, url: string) =>
    request(app.getHttpServer()).get(url).set(authHeader(user))
  const post = (user: TestUser, url: string, body: unknown = {}) =>
    request(app.getHttpServer())
      .post(url)
      .set(authHeader(user))
      .send(body as object)
  const del = (user: TestUser, url: string) =>
    request(app.getHttpServer()).delete(url).set(authHeader(user))

  async function createProject(
    user: TestUser,
    overrides: Record<string, unknown> = {},
  ): Promise<ProjectJson> {
    return (await post(user, '/v1/projects', newProject(overrides)).expect(201))
      .body
  }

  // Sube de verdad unos bytes chicos a la ruta y token que ya firmó la API, igual que haría el
  // navegador con `uploadToSignedUrl`. Registra la ruta para borrarla al final.
  async function uploadReal(
    signed: SignedUpload,
    bytes: Uint8Array,
    contentType: string,
  ) {
    uploadedPaths.push(signed.path)
    const { error } = await storageClient.uploadToSignedUrl(
      signed.path,
      signed.token,
      new Blob([bytes], { type: contentType }),
    )
    if (error) throw error
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    db = moduleRef.get(DB)
    storage = moduleRef.get(StorageService)
    userA = await createTestUser()
    userB = await createTestUser()

    await post(userA, '/v1/me/onboarding', {
      name: 'Ana',
      avatarPath: 'star',
      sections: ['projects'],
    }).expect(201)
    await post(userB, '/v1/me/onboarding', {
      name: 'Beto',
      avatarPath: 'moon',
      sections: ['projects'],
    }).expect(201)
  })

  afterAll(async () => {
    await storage.remove(uploadedPaths)
    // Todo cuelga de profiles con ON DELETE CASCADE: borrar el perfil se lleva proyectos y archivos.
    await db.delete(profiles).where(eq(profiles.id, userA.id))
    await db.delete(profiles).where(eq(profiles.id, userB.id))
    await deleteTestUser(userA.id)
    await deleteTestUser(userB.id)
    await app.close()
    await db.$client.end()
  })

  describe('archivos de un proyecto', () => {
    it('sube de verdad un archivo (URL firmada, subida real, confirmar) y aparece en la lista', async () => {
      const project = await createProject(userA)
      const bytes = new TextEncoder().encode('contenido de prueba')

      const signed = (
        await post(
          userA,
          `/v1/projects/${project.id}/attachments/sign-upload`,
          {
            name: 'notas.txt',
            mime: 'text/plain',
            sizeBytes: bytes.byteLength,
          },
        ).expect(201)
      ).body as SignedUpload
      await uploadReal(signed, bytes, 'text/plain')

      const confirmed = (
        await post(userA, `/v1/projects/${project.id}/attachments/confirm`, {
          path: signed.path,
          name: 'notas.txt',
        }).expect(201)
      ).body as AttachmentJson
      expect(confirmed).toMatchObject({
        name: 'notas.txt',
        kind: 'doc',
        sizeBytes: bytes.byteLength,
      })

      const list = (
        await get(userA, `/v1/projects/${project.id}/attachments`).expect(200)
      ).body as { files: AttachmentJson[] }
      expect(list.files.map((file) => file.id)).toContain(confirmed.id)
    })

    it('rechaza un tipo de archivo no permitido antes de firmar nada', async () => {
      const project = await createProject(userA)
      await post(userA, `/v1/projects/${project.id}/attachments/sign-upload`, {
        name: 'virus.exe',
        mime: 'application/octet-stream',
        sizeBytes: 10,
      }).expect(400)
    })

    it('rechaza un archivo más pesado que el límite', async () => {
      const project = await createProject(userA)
      await post(userA, `/v1/projects/${project.id}/attachments/sign-upload`, {
        name: 'grande.pdf',
        mime: 'application/pdf',
        sizeBytes: 999_999_999_999,
      }).expect(400)
    })

    it('nadie puede subir, listar, confirmar ni borrar archivos del proyecto de otra persona', async () => {
      const project = await createProject(userA)
      await post(userB, `/v1/projects/${project.id}/attachments/sign-upload`, {
        name: 'a.pdf',
        mime: 'application/pdf',
        sizeBytes: 10,
      }).expect(404)
      await get(userB, `/v1/projects/${project.id}/attachments`).expect(404)
      await post(userB, `/v1/projects/${project.id}/attachments/confirm`, {
        path: `${userA.id}/projects/${project.id}/x.pdf`,
        name: 'a.pdf',
      }).expect(404)
      await del(
        userB,
        `/v1/projects/${project.id}/attachments/${UNKNOWN_ID}`,
      ).expect(404)
    })

    it('un proyecto que no existe (o no es suyo) responde 404', async () => {
      await post(userA, `/v1/projects/${UNKNOWN_ID}/attachments/sign-upload`, {
        name: 'a.pdf',
        mime: 'application/pdf',
        sizeBytes: 10,
      }).expect(404)
    })

    it('rechaza entradas inválidas', async () => {
      const project = await createProject(userA)
      await post(userA, `/v1/projects/${project.id}/attachments/sign-upload`, {
        name: '',
        mime: 'application/pdf',
        sizeBytes: 10,
      }).expect(400)
      await post(userA, `/v1/projects/${project.id}/attachments/sign-upload`, {
        name: 'a.pdf',
        mime: 'application/pdf',
        sizeBytes: -1,
      }).expect(400)
    })

    it('una ruta que no empieza con "<userId>/projects/<projectId>/" no se puede confirmar', async () => {
      const project = await createProject(userA)
      await post(userA, `/v1/projects/${project.id}/attachments/confirm`, {
        path: `${userA.id}/projects/otro-proyecto/x.pdf`,
        name: 'x.pdf',
      }).expect(404)
    })

    it('borrar manda a la papelera y no sale en la lista; restaurar la devuelve', async () => {
      const project = await createProject(userA)
      const bytes = new TextEncoder().encode('x')
      const signed = (
        await post(
          userA,
          `/v1/projects/${project.id}/attachments/sign-upload`,
          { name: 'uno.txt', mime: 'text/plain', sizeBytes: 1 },
        ).expect(201)
      ).body as SignedUpload
      await uploadReal(signed, bytes, 'text/plain')
      const created = (
        await post(userA, `/v1/projects/${project.id}/attachments/confirm`, {
          path: signed.path,
          name: 'uno.txt',
        }).expect(201)
      ).body as AttachmentJson

      await del(
        userA,
        `/v1/projects/${project.id}/attachments/${created.id}`,
      ).expect(200)
      const afterDelete = (
        await get(userA, `/v1/projects/${project.id}/attachments`).expect(200)
      ).body as { files: AttachmentJson[] }
      expect(afterDelete.files.map((file) => file.id)).not.toContain(created.id)

      await post(
        userA,
        `/v1/projects/${project.id}/attachments/${created.id}/restore`,
      ).expect(201)
      const afterRestore = (
        await get(userA, `/v1/projects/${project.id}/attachments`).expect(200)
      ).body as { files: AttachmentJson[] }
      expect(afterRestore.files.map((file) => file.id)).toContain(created.id)
    })
  })

  describe('portada subida de un proyecto', () => {
    it('sube una portada real y la API la resuelve a una URL firmada (coverUrl)', async () => {
      const project = await createProject(userA, { cover: null })
      const bytes = new TextEncoder().encode('fake-png-bytes')

      const signed = (
        await post(userA, `/v1/projects/${project.id}/cover/sign-upload`, {
          name: 'portada.png',
          mime: 'image/png',
          sizeBytes: bytes.byteLength,
        }).expect(201)
      ).body as SignedUpload
      await uploadReal(signed, bytes, 'image/png')

      const confirmed = (
        await post(userA, `/v1/projects/${project.id}/cover/confirm`, {
          path: signed.path,
        }).expect(201)
      ).body as ProjectJson
      expect(confirmed.coverPath).toBe(`storage:${signed.path}`)
      expect(confirmed.coverUrl).toBeTruthy()

      const read = (await get(userA, `/v1/projects/${project.id}`).expect(200))
        .body as ProjectJson
      expect(read.coverUrl).toBeTruthy()
    })

    it('subir una portada nueva borra de Storage la anterior', async () => {
      const project = await createProject(userA, { cover: null })
      const first = (
        await post(userA, `/v1/projects/${project.id}/cover/sign-upload`, {
          name: 'uno.png',
          mime: 'image/png',
          sizeBytes: 3,
        }).expect(201)
      ).body as SignedUpload
      await uploadReal(first, new TextEncoder().encode('abc'), 'image/png')
      await post(userA, `/v1/projects/${project.id}/cover/confirm`, {
        path: first.path,
      }).expect(201)

      const second = (
        await post(userA, `/v1/projects/${project.id}/cover/sign-upload`, {
          name: 'dos.png',
          mime: 'image/png',
          sizeBytes: 3,
        }).expect(201)
      ).body as SignedUpload
      await uploadReal(second, new TextEncoder().encode('xyz'), 'image/png')
      await post(userA, `/v1/projects/${project.id}/cover/confirm`, {
        path: second.path,
      }).expect(201)

      const { data } = await storageClient.list(
        `${userA.id}/projects/${project.id}/cover`,
      )
      expect(
        (data ?? []).some((entry) => first.path.endsWith(entry.name)),
      ).toBe(false)
    })

    it('una portada ilustrada no tiene coverUrl (el front la dibuja)', async () => {
      const project = await createProject(userA, { cover: 'olas' })
      expect(project.coverPath).toBe('preset:olas')
      expect(project.coverUrl).toBeNull()
    })

    it('rechaza una imagen de portada más pesada que el límite, y un tipo que no es imagen', async () => {
      const project = await createProject(userA)
      await post(userA, `/v1/projects/${project.id}/cover/sign-upload`, {
        name: 'grande.png',
        mime: 'image/png',
        sizeBytes: 999_999_999,
      }).expect(400)
      await post(userA, `/v1/projects/${project.id}/cover/sign-upload`, {
        name: 'notas.pdf',
        mime: 'application/pdf',
        sizeBytes: 10,
      }).expect(400)
    })

    it('nadie puede subir ni confirmar la portada de un proyecto de otra persona', async () => {
      const project = await createProject(userA)
      await post(userB, `/v1/projects/${project.id}/cover/sign-upload`, {
        name: 'x.png',
        mime: 'image/png',
        sizeBytes: 10,
      }).expect(404)
      await post(userB, `/v1/projects/${project.id}/cover/confirm`, {
        path: `${userA.id}/projects/${project.id}/cover/x.png`,
      }).expect(404)
    })
  })
})
