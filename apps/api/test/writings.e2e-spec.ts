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

// Crear 2 usuarios reales en Supabase Auth tarda más que el timeout default
// de un hook (mismo motivo que account.e2e-spec.ts).
jest.setTimeout(30000)

// El perfil nace con America/Mexico_City: "hoy" para la API es el de esa zona.
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

type Field = { id: string; kind: string; key: string | null; name: string; type: string; hint: string; options: { id: string; label: string; tone: string }[] }
type Template = { id: string; worldId: string; key: string | null; name: string; color: string; fields: Field[] }
type World = { id: string; name: string; tabs: string[] | null; stats: string[] | null; synopsis: string }
type Entry = { id: string; worldId: string; name: string; values: Record<string, unknown>; parentId?: string | null; sections?: string[]; cover: { mode: string; color: string | null } }
type Library = {
  worlds: World[]
  templates: Template[]
  characters: Entry[]
  notes: Entry[]
  eras: { id: string; worldId: string; name: string; position: number }[]
  events: { id: string; eraId: string; title: string; position: number }[]
  stories: { id: string; worldId: string | null; title: string }[]
  pages: { id: string; storyId: string | null; kind: string; content: unknown }[]
}

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

describe('Escritos (e2e)', () => {
  let app: INestApplication
  let db: PostgresJsDatabase
  let userA: TestUser
  let userB: TestUser

  const get = (user: TestUser, url: string) => request(app.getHttpServer()).get(url).set(authHeader(user))
  const post = (user: TestUser, url: string, body: unknown = {}) => request(app.getHttpServer()).post(url).set(authHeader(user)).send(body as object)
  const patch = (user: TestUser, url: string, body: unknown) => request(app.getHttpServer()).patch(url).set(authHeader(user)).send(body as object)
  const del = (user: TestUser, url: string) => request(app.getHttpServer()).delete(url).set(authHeader(user))

  const library = async (user: TestUser): Promise<Library> => (await get(user, '/v1/writings/library').expect(200)).body
  const createWorld = async (user: TestUser, name = 'Aurelun'): Promise<World> => (await post(user, '/v1/writings/worlds', { name, description: 'Un mundo de prueba' }).expect(201)).body
  const templatesOf = async (user: TestUser, worldId: string) => (await library(user)).templates.filter((template) => template.worldId === worldId)
  const templateByKey = async (user: TestUser, worldId: string, key: string) => (await templatesOf(user, worldId)).find((template) => template.key === key)!
  const fieldOf = (template: Template, name: string) => template.fields.find((field) => field.name === name)!
  const createCharacter = async (user: TestUser, worldId: string, name = 'Jericó'): Promise<Entry> => (await post(user, `/v1/writings/worlds/${worldId}/characters`, { name }).expect(201)).body
  const createNote = async (user: TestUser, worldId: string, templateId: string, name: string, parentId: string | null = null): Promise<Entry> =>
    (await post(user, `/v1/writings/worlds/${worldId}/notes`, { templateId, parentId, name }).expect(201)).body
  const createEra = async (user: TestUser, worldId: string, name: string) => (await post(user, `/v1/writings/worlds/${worldId}/eras`, { name }).expect(201)).body as { id: string }
  const createStory = async (user: TestUser, worldId: string | null, kind = 'story') =>
    (await post(user, '/v1/writings/stories', { title: 'Un cuento de amores y dragones', kind, summary: '', color: 'ink', wordGoal: 30000, worldId }).expect(201)).body as { id: string; status: string }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    db = moduleRef.get(DB)
    userA = await createTestUser()
    userB = await createTestUser()

    await post(userA, '/v1/me/onboarding', { name: 'Ana', avatarPath: 'star', sections: ['writings'] }).expect(201)
    await post(userB, '/v1/me/onboarding', { name: 'Beto', avatarPath: 'moon', sections: ['writings'] }).expect(201)
  })

  afterAll(async () => {
    // Todo cuelga de profiles con ON DELETE CASCADE: borrar el perfil se lleva mundos, notas, historias y páginas.
    await db.delete(profiles).where(eq(profiles.id, userA.id))
    await db.delete(profiles).where(eq(profiles.id, userB.id))
    await deleteTestUser(userA.id)
    await deleteTestUser(userB.id)
    await app.close()
    // app.close() no cierra la conexión de Postgres (mismo motivo que account.e2e-spec.ts).
    await db.$client.end()
  })

  it('rechaza peticiones sin token o con un token inválido', async () => {
    await request(app.getHttpServer()).get('/v1/writings/library').expect(401)
    await request(app.getHttpServer()).get('/v1/writings/library').set({ Authorization: 'Bearer no-es-un-token' }).expect(401)
  })

  describe('mundos y plantillas', () => {
    it('un mundo nace con sus 3 plantillas de fábrica, cada campo con su id', async () => {
      const world = await createWorld(userA)
      const templates = await templatesOf(userA, world.id)
      expect(templates.map((template) => template.key).sort()).toEqual(['character', 'place', 'species'])
      const place = templates.find((template) => template.key === 'place')!
      expect(fieldOf(place, 'Tipo de lugar').options.map((option) => option.id)).toContain('region')
      expect(new Set(templates.flatMap((template) => template.fields.map((field) => field.id))).size).toBe(templates.reduce((sum, template) => sum + template.fields.length, 0))
    })

    it('cada quien solo ve lo suyo en la biblioteca', async () => {
      const world = await createWorld(userA, 'Solo de Ana')
      const ofB = await library(userB)
      expect(ofB.worlds.some((item) => item.id === world.id)).toBe(false)
      expect(ofB.templates.some((item) => item.worldId === world.id)).toBe(false)
    })

    it('otra persona no puede editar, borrar ni restaurar un mundo ajeno', async () => {
      const world = await createWorld(userA)
      await patch(userB, `/v1/writings/worlds/${world.id}`, { name: 'Robado' }).expect(404)
      await del(userB, `/v1/writings/worlds/${world.id}`).expect(404)
      await post(userB, `/v1/writings/worlds/${world.id}/restore`).expect(404)
      await post(userB, `/v1/writings/worlds/${world.id}/templates`, { name: 'Magia' }).expect(404)
      await post(userB, `/v1/writings/worlds/${world.id}/map/sign-upload`, { name: 'mapa.png', mime: 'image/png', sizeBytes: 1000 }).expect(404)
    })

    it('guarda sinopsis, pestañas y contadores; una sección de otro mundo no entra en la barra', async () => {
      const world = await createWorld(userA)
      const other = await createWorld(userA, 'Otro')
      const section = (await post(userA, `/v1/writings/worlds/${world.id}/templates`, { name: 'Magia' }).expect(201)).body as Template
      const foreign = (await post(userA, `/v1/writings/worlds/${other.id}/templates`, { name: 'Ajena' }).expect(201)).body as Template

      const updated = (await patch(userA, `/v1/writings/worlds/${world.id}`, { synopsis: 'Antes de la Luna…', tabs: ['resumen', 'timeline', `tpl:${section.id}`], stats: ['eras', `tpl:${section.id}`] }).expect(200)).body as World
      expect(updated.tabs).toEqual(['resumen', 'timeline', `tpl:${section.id}`])
      expect(updated.synopsis).toBe('Antes de la Luna…')

      await patch(userA, `/v1/writings/worlds/${world.id}`, { tabs: ['resumen', `tpl:${foreign.id}`] }).expect(400)
      await patch(userA, `/v1/writings/worlds/${world.id}`, { tabs: ['timeline'] }).expect(400)
      await patch(userA, `/v1/writings/worlds/${world.id}`, {}).expect(400)
    })

    it('edita una plantilla sin perder ids; un campo especial no va en la plantilla equivocada', async () => {
      const world = await createWorld(userA)
      const species = await templateByKey(userA, world.id, 'species')
      const renamed = species.fields.map((field) => (field.name === 'Cuánto vive' ? { ...field, name: 'Esperanza de vida' } : field))
      const updated = (await patch(userA, `/v1/writings/templates/${species.id}`, { fields: renamed }).expect(200)).body as Template
      expect(updated.fields.find((field) => field.id === fieldOf(species, 'Cuánto vive').id)?.name).toBe('Esperanza de vida')

      const withRole = [...species.fields, { id: crypto.randomUUID(), kind: 'field', key: 'role', name: 'Rol', type: 'text', hint: '', options: [] }]
      await patch(userA, `/v1/writings/templates/${species.id}`, { fields: withRole }).expect(400)
      await patch(userB, `/v1/writings/templates/${species.id}`, { name: 'Robada' }).expect(404)
    })

    it('una plantilla de fábrica no se borra; una sección sí, con sus notas, y vuelve con "Deshacer"', async () => {
      const world = await createWorld(userA)
      const place = await templateByKey(userA, world.id, 'place')
      await del(userA, `/v1/writings/templates/${place.id}`).expect(400)

      const section = (await post(userA, `/v1/writings/worlds/${world.id}/templates`, { name: 'Magia' }).expect(201)).body as Template
      const note = await createNote(userA, world.id, section.id, 'Magia lunar')
      await del(userB, `/v1/writings/templates/${section.id}`).expect(404)
      await del(userA, `/v1/writings/templates/${section.id}`).expect(204)
      expect((await library(userA)).notes.some((item) => item.id === note.id)).toBe(false)

      await post(userA, `/v1/writings/templates/${section.id}/restore`).expect(204)
      expect((await library(userA)).notes.some((item) => item.id === note.id)).toBe(true)
    })

    it('borrar un mundo se lleva todo lo suyo y "Deshacer" lo devuelve junto', async () => {
      const world = await createWorld(userA, 'Para borrar')
      const character = await createCharacter(userA, world.id)
      const era = await createEra(userA, world.id, 'Era Lunar')
      const story = await createStory(userA, world.id)
      const chapter = (await post(userA, '/v1/writings/pages', { kind: 'chapter', storyId: story.id, title: 'Antecedentes' }).expect(201)).body as { id: string }

      await del(userA, `/v1/writings/worlds/${world.id}`).expect(204)
      let lib = await library(userA)
      expect(lib.worlds.some((item) => item.id === world.id)).toBe(false)
      expect(lib.characters.some((item) => item.id === character.id)).toBe(false)
      expect(lib.eras.some((item) => item.id === era.id)).toBe(false)
      expect(lib.pages.some((item) => item.id === chapter.id)).toBe(false)

      await post(userA, `/v1/writings/worlds/${world.id}/restore`).expect(204)
      lib = await library(userA)
      expect(lib.characters.some((item) => item.id === character.id)).toBe(true)
      expect(lib.stories.some((item) => item.id === story.id)).toBe(true)
      expect(lib.pages.some((item) => item.id === chapter.id)).toBe(true)
    })
  })

  describe('personajes y notas', () => {
    it('guarda los valores revisados contra la plantilla y junta lo que no cambió', async () => {
      const world = await createWorld(userA)
      const tpl = await templateByKey(userA, world.id, 'character')
      const character = await createCharacter(userA, world.id)
      const age = fieldOf(tpl, 'Edad')
      const role = fieldOf(tpl, 'Rol en la historia')

      await patch(userA, `/v1/writings/characters/${character.id}`, { values: { [age.id]: '19' } }).expect(200)
      const updated = (await patch(userA, `/v1/writings/characters/${character.id}`, { values: { [role.id]: 'Protagonista' } }).expect(200)).body as Entry
      expect(updated.values).toEqual({ [age.id]: '19', [role.id]: 'Protagonista' })

      // Un campo que no está en la plantilla, o un valor del tipo equivocado, no se guarda.
      await patch(userA, `/v1/writings/characters/${character.id}`, { values: { [UNKNOWN_ID]: 'x' } }).expect(400)
      await patch(userA, `/v1/writings/characters/${character.id}`, { values: { [age.id]: ['no', 'es', 'texto'] } }).expect(400)
    })

    it('un vínculo solo puede apuntar a algo del mismo mundo de la misma persona', async () => {
      const world = await createWorld(userA)
      const otherWorld = await createWorld(userA, 'Otro')
      const tpl = await templateByKey(userA, world.id, 'character')
      const speciesTpl = await templateByKey(userA, world.id, 'species')
      const origin = fieldOf(tpl, 'Especie')
      const character = await createCharacter(userA, world.id)
      const hadas = await createNote(userA, world.id, speciesTpl.id, 'Hadas')
      const foreign = await createCharacter(userA, otherWorld.id, 'De otro mundo')
      const bWorld = await createWorld(userB)
      const ofB = await createCharacter(userB, bWorld.id, 'De Beto')

      await patch(userA, `/v1/writings/characters/${character.id}`, { values: { [origin.id]: [hadas.id] } }).expect(200)
      await patch(userA, `/v1/writings/characters/${character.id}`, { values: { [origin.id]: [foreign.id] } }).expect(400)
      await patch(userA, `/v1/writings/characters/${character.id}`, { values: { [origin.id]: [ofB.id] } }).expect(400)
      await patch(userA, `/v1/writings/characters/${character.id}`, { values: { [origin.id]: [character.id] } }).expect(400)
    })

    it('otra persona no puede leer, editar, borrar ni subir foto a un personaje ajeno', async () => {
      const world = await createWorld(userA)
      const character = await createCharacter(userA, world.id)
      await get(userB, `/v1/writings/characters/${character.id}`).expect(404)
      await patch(userB, `/v1/writings/characters/${character.id}`, { name: 'Robado' }).expect(404)
      await del(userB, `/v1/writings/characters/${character.id}`).expect(404)
      await post(userB, `/v1/writings/characters/${character.id}/image/sign-upload`, { name: 'foto.png', mime: 'image/png', sizeBytes: 1000 }).expect(404)
      await post(userB, `/v1/writings/characters/${character.id}/image/confirm`, { path: `${userA.id}/writings/characters/${character.id}/image/x.png` }).expect(404)
      await post(userB, `/v1/writings/worlds/${world.id}/characters`, { name: 'Intruso' }).expect(404)
    })

    it('la foto de un personaje solo se sube como imagen, y la ruta confirmada tiene que ser la suya', async () => {
      const world = await createWorld(userA)
      const character = await createCharacter(userA, world.id)
      await post(userA, `/v1/writings/characters/${character.id}/image/sign-upload`, { name: 'virus.exe', mime: 'application/octet-stream', sizeBytes: 1000 }).expect(400)
      await post(userA, `/v1/writings/characters/${character.id}/image/confirm`, { path: `${userB.id}/writings/characters/${character.id}/image/x.png` }).expect(404)
      // Modo "imagen" sin una imagen subida no se acepta.
      await patch(userA, `/v1/writings/characters/${character.id}`, { cover: { mode: 'image', color: null, position: 1 } }).expect(400)
      const colored = (await patch(userA, `/v1/writings/characters/${character.id}`, { cover: { mode: 'color', color: 'sage', position: 1 } }).expect(200)).body as Entry
      expect(colored.cover).toMatchObject({ mode: 'color', color: 'sage' })
    })

    it('las secciones donde también aparece un personaje son de su mundo', async () => {
      const world = await createWorld(userA)
      const section = (await post(userA, `/v1/writings/worlds/${world.id}/templates`, { name: 'Deidades' }).expect(201)).body as Template
      const species = await templateByKey(userA, world.id, 'species')
      const luna = await createCharacter(userA, world.id, 'Luna')
      const updated = (await patch(userA, `/v1/writings/characters/${luna.id}`, { sections: [section.id] }).expect(200)).body as Entry
      expect(updated.sections).toEqual([section.id])
      await patch(userA, `/v1/writings/characters/${luna.id}`, { sections: [species.id] }).expect(400)
    })

    it('lugares dentro de lugares, sin círculos; borrar uno se lleva los de adentro', async () => {
      const world = await createWorld(userA)
      const place = await templateByKey(userA, world.id, 'place')
      const vadronia = await createNote(userA, world.id, place.id, 'Vadronia')
      const sudria = await createNote(userA, world.id, place.id, 'Sudria', vadronia.id)
      const castillo = await createNote(userA, world.id, place.id, 'El castillo', sudria.id)

      await patch(userA, `/v1/writings/notes/${vadronia.id}`, { parentId: castillo.id }).expect(400)
      await patch(userA, `/v1/writings/notes/${vadronia.id}`, { parentId: vadronia.id }).expect(400)

      await del(userA, `/v1/writings/notes/${vadronia.id}`).expect(204)
      let ids = (await library(userA)).notes.map((note) => note.id)
      expect(ids).not.toContain(sudria.id)
      expect(ids).not.toContain(castillo.id)

      await post(userA, `/v1/writings/notes/${vadronia.id}/restore`).expect(204)
      ids = (await library(userA)).notes.map((note) => note.id)
      expect(ids).toEqual(expect.arrayContaining([vadronia.id, sudria.id, castillo.id]))
    })

    it('una nota no se crea con la plantilla de personajes ni con una de otro mundo', async () => {
      const world = await createWorld(userA)
      const other = await createWorld(userA, 'Otro')
      const character = await templateByKey(userA, world.id, 'character')
      const foreign = await templateByKey(userA, other.id, 'species')
      await post(userA, `/v1/writings/worlds/${world.id}/notes`, { templateId: character.id, parentId: null, name: 'X' }).expect(400)
      await post(userA, `/v1/writings/worlds/${world.id}/notes`, { templateId: foreign.id, parentId: null, name: 'X' }).expect(400)
    })

    it('otra persona no puede leer, editar ni borrar una nota ajena', async () => {
      const world = await createWorld(userA)
      const species = await templateByKey(userA, world.id, 'species')
      const note = await createNote(userA, world.id, species.id, 'Hadas')
      await get(userB, `/v1/writings/notes/${note.id}`).expect(404)
      await patch(userB, `/v1/writings/notes/${note.id}`, { name: 'Robada' }).expect(404)
      await del(userB, `/v1/writings/notes/${note.id}`).expect(404)
      await post(userB, `/v1/writings/notes/${note.id}/cover/sign-upload`, { name: 'p.png', mime: 'image/png', sizeBytes: 10 }).expect(404)
    })

    it('el contenido de una ficha pasa por la misma revisión que una página', async () => {
      const world = await createWorld(userA)
      const character = await createCharacter(userA, world.id)
      await patch(userA, `/v1/writings/characters/${character.id}`, { content: { type: 'doc', content: [{ type: 'script', text: 'alert(1)' }] } }).expect(400)
      await patch(userA, `/v1/writings/characters/${character.id}`, { content: doc('Escena 1') }).expect(200)
      const full = (await get(userA, `/v1/writings/characters/${character.id}`).expect(200)).body as { content: unknown }
      expect(full.content).toEqual(doc('Escena 1'))
    })
  })

  describe('línea del tiempo', () => {
    it('eras en orden que se mueven con flechas; otra persona no las toca', async () => {
      const world = await createWorld(userA)
      const lunar = await createEra(userA, world.id, 'Era Lunar')
      const filo = await createEra(userA, world.id, 'Era del Filo Interno')
      await post(userA, `/v1/writings/eras/${filo.id}/move`, { direction: 'up' }).expect(204)
      const eras = (await library(userA)).eras.filter((era) => era.worldId === world.id).sort((a, b) => a.position - b.position)
      expect(eras.map((era) => era.id)).toEqual([filo.id, lunar.id])

      await patch(userB, `/v1/writings/eras/${lunar.id}`, { name: 'Robada' }).expect(404)
      await post(userB, `/v1/writings/eras/${lunar.id}/move`, { direction: 'down' }).expect(404)
      await del(userB, `/v1/writings/eras/${lunar.id}`).expect(404)
      await post(userB, `/v1/writings/worlds/${world.id}/eras`, { name: 'Intrusa' }).expect(404)
    })

    it('un evento con quién y dónde del mismo mundo; cambia de era y queda al final', async () => {
      const world = await createWorld(userA)
      const otherWorld = await createWorld(userA, 'Otro')
      const place = await templateByKey(userA, world.id, 'place')
      const lunar = await createEra(userA, world.id, 'Era Lunar')
      const filo = await createEra(userA, world.id, 'Era del Filo Interno')
      const foreignEra = await createEra(userA, otherWorld.id, 'Ajena')
      const cross = await createCharacter(userA, world.id, 'Cross')
      const vadronia = await createNote(userA, world.id, place.id, 'Vadronia')
      const foreign = await createCharacter(userA, otherWorld.id, 'De otro mundo')

      await post(userA, '/v1/writings/events', { eraId: filo.id, title: 'El rey Krandalf' }).expect(201)
      const event = (await post(userA, '/v1/writings/events', { eraId: lunar.id, title: 'Surge Cross' }).expect(201)).body as { id: string }
      await patch(userA, `/v1/writings/events/${event.id}`, { who: [cross.id], where: [vadronia.id], notes: ['Primera mestiza.'] }).expect(200)
      await patch(userA, `/v1/writings/events/${event.id}`, { who: [foreign.id] }).expect(400)
      await patch(userA, `/v1/writings/events/${event.id}`, { eraId: foreignEra.id }).expect(400)

      const moved = (await patch(userA, `/v1/writings/events/${event.id}`, { eraId: filo.id }).expect(200)).body as { eraId: string; position: number }
      expect(moved.eraId).toBe(filo.id)
      expect(moved.position).toBe(1)

      await patch(userB, `/v1/writings/events/${event.id}`, { title: 'Robado' }).expect(404)
      await del(userB, `/v1/writings/events/${event.id}`).expect(404)
      await post(userB, '/v1/writings/events', { eraId: lunar.id, title: 'Intruso' }).expect(400)
    })

    it('borrar una era se lleva sus eventos; "Deshacer" los devuelve', async () => {
      const world = await createWorld(userA)
      const era = await createEra(userA, world.id, 'Era Lunar')
      const event = (await post(userA, '/v1/writings/events', { eraId: era.id, title: 'Separación cósmica' }).expect(201)).body as { id: string }
      await del(userA, `/v1/writings/eras/${era.id}`).expect(204)
      expect((await library(userA)).events.some((item) => item.id === event.id)).toBe(false)
      await post(userA, `/v1/writings/eras/${era.id}/restore`).expect(204)
      expect((await library(userA)).events.some((item) => item.id === event.id)).toBe(true)
    })
  })

  describe('historias y páginas', () => {
    it('una historia con era, lugar, arcos y elenco de su mundo', async () => {
      const world = await createWorld(userA)
      const otherWorld = await createWorld(userA, 'Otro')
      const place = await templateByKey(userA, world.id, 'place')
      const era = await createEra(userA, world.id, 'Letargo Dorado')
      const vadronia = await createNote(userA, world.id, place.id, 'Vadronia')
      const jerico = await createCharacter(userA, world.id, 'Jericó')
      const foreign = await createCharacter(userA, otherWorld.id, 'De otro mundo')
      const story = await createStory(userA, world.id)
      expect(story.status).toBe('in_progress')

      const arc = { id: crypto.randomUUID(), name: 'Arco 1' }
      await patch(userA, `/v1/writings/stories/${story.id}`, { eraId: era.id, placeId: vadronia.id, cast: [jerico.id], arcs: [arc] }).expect(200)
      await patch(userA, `/v1/writings/stories/${story.id}`, { cast: [foreign.id] }).expect(400)
      await patch(userA, `/v1/writings/stories/${story.id}`, { resources: [{ id: crypto.randomUUID(), name: 'Malo', url: 'javascript:alert(1)' }] }).expect(400)

      // Una historia suelta (sin mundo) no tiene de dónde sacar personajes.
      const loose = await createStory(userA, null)
      await patch(userA, `/v1/writings/stories/${loose.id}`, { cast: [jerico.id] }).expect(400)

      await patch(userB, `/v1/writings/stories/${story.id}`, { title: 'Robada' }).expect(404)
      await del(userB, `/v1/writings/stories/${story.id}`).expect(404)
      await post(userB, '/v1/writings/stories', { title: 'X', kind: 'story', summary: '', color: 'ink', wordGoal: null, worldId: world.id }).expect(404)
    })

    it('un capítulo va en una historia, una página en un cuaderno y una nota suelta', async () => {
      const story = await createStory(userA, null, 'story')
      const notebook = await createStory(userA, null, 'notebook')
      await post(userA, '/v1/writings/pages', { kind: 'page', storyId: story.id, title: 'X' }).expect(400)
      await post(userA, '/v1/writings/pages', { kind: 'chapter', storyId: notebook.id, title: 'X' }).expect(400)
      await post(userA, '/v1/writings/pages', { kind: 'note', storyId: story.id, title: 'X' }).expect(400)
      await post(userA, '/v1/writings/pages', { kind: 'note', storyId: null, title: 'Pendientes de Aurelun' }).expect(201)
      await post(userB, '/v1/writings/pages', { kind: 'chapter', storyId: story.id, title: 'Intruso' }).expect(400)
    })

    it('guardar cuenta las palabras en la API y las suma al día de hoy', async () => {
      const story = await createStory(userA, null)
      const page = (await post(userA, '/v1/writings/pages', { kind: 'chapter', storyId: story.id, title: 'Antecedentes' }).expect(201)).body as { id: string }
      const before = ((await get(userA, `/v1/writings/days?from=${TODAY}`).expect(200)).body as { day: string; words: number }[]).find((day) => day.day === TODAY)?.words ?? 0

      const saved = (await patch(userA, `/v1/writings/pages/${page.id}`, { title: 'Antecedentes', status: 'in_progress', tag: null, content: doc('uno dos tres cuatro') }).expect(200)).body as { wordCount: number }
      expect(saved.wordCount).toBe(4)
      // Borrar texto no resta lo ya escrito.
      await patch(userA, `/v1/writings/pages/${page.id}`, { title: 'Antecedentes', status: 'in_progress', tag: null, content: doc('uno') }).expect(200)

      const after = ((await get(userA, `/v1/writings/days?from=${TODAY}`).expect(200)).body as { day: string; words: number }[]).find((day) => day.day === TODAY)?.words ?? 0
      expect(after - before).toBe(4)
      await get(userA, '/v1/writings/days?from=ayer').expect(400)
    })

    it('el arco, la era y el punto de vista de un capítulo salen de su historia y su mundo', async () => {
      const world = await createWorld(userA)
      const era = await createEra(userA, world.id, 'Letargo Dorado')
      const jerico = await createCharacter(userA, world.id, 'Jericó')
      const story = await createStory(userA, world.id)
      const arc = { id: crypto.randomUUID(), name: 'Arco 1' }
      await patch(userA, `/v1/writings/stories/${story.id}`, { arcs: [arc] }).expect(200)
      const page = (await post(userA, '/v1/writings/pages', { kind: 'chapter', storyId: story.id, title: 'Jericó' }).expect(201)).body as { id: string }

      const meta = (await patch(userA, `/v1/writings/pages/${page.id}/meta`, { arcId: arc.id, eraId: era.id, povCharacterId: jerico.id }).expect(200)).body as { arcId: string }
      expect(meta.arcId).toBe(arc.id)
      await patch(userA, `/v1/writings/pages/${page.id}/meta`, { arcId: UNKNOWN_ID }).expect(400)
    })

    it('otra persona no puede leer, guardar ni borrar una página ajena', async () => {
      const page = (await post(userA, '/v1/writings/pages', { kind: 'note', storyId: null, title: 'Secreta' }).expect(201)).body as { id: string }
      await get(userB, `/v1/writings/pages/${page.id}`).expect(404)
      await patch(userB, `/v1/writings/pages/${page.id}`, { title: 'X', status: 'none', tag: null, content: doc('x') }).expect(404)
      await patch(userB, `/v1/writings/pages/${page.id}/meta`, { arcId: null }).expect(404)
      await del(userB, `/v1/writings/pages/${page.id}`).expect(404)
      await post(userB, `/v1/writings/pages/${page.id}/restore`).expect(404)
    })

    it('el contenido de una página se revisa antes de guardarse', async () => {
      const page = (await post(userA, '/v1/writings/pages', { kind: 'note', storyId: null, title: 'Nota' }).expect(201)).body as { id: string }
      const bad = { type: 'doc', content: [{ type: 'image', attrs: { src: 'javascript:alert(1)' } }] }
      await patch(userA, `/v1/writings/pages/${page.id}`, { title: 'Nota', status: 'none', tag: 'Ideas', content: bad }).expect(400)
    })
  })
})
