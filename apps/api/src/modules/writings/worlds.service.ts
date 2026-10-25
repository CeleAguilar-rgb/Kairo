import { randomUUID } from 'node:crypto'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  classifyProjectFile,
  COVER_IMAGE_MAX_BYTES,
  DEFAULT_TEMPLATES,
  NEW_SECTION_TEMPLATE,
  type SignCoverUploadInput,
  type TemplateFieldInput,
  type TemplateSeed,
  type TemplateUpdateInput,
  type WorldInput,
  type WorldUpdateInput,
} from '@kairo/shared'
import { StorageService } from '../../common/storage/storage.service'
import { EntriesRepository, type CharacterListRow, type NoteListRow } from './entries.repository'
import { StoriesRepository } from './stories.repository'
import { TimelineRepository } from './timeline.repository'
import { badRequest, publicFields, type WorldRefs } from './writings-utils'
import { WorldsRepository, type TemplateRow, type WorldRow } from './worlds.repository'

// Qué campo especial puede llevar cada plantilla de fábrica: "Rol" solo en Personaje, "Dónde vive" solo en
// Especie y "Tipo de lugar" solo en Lugar (la app los lee para armar el Resumen, las especies por región y las
// tarjetas de Regiones).
const KEY_ALLOWED_IN: Record<string, TemplateRow['key']> = { role: 'character', home: 'species', place_type: 'place' }

// Cada campo de una plantilla sembrada recibe su id al crearse el mundo: desde ahí no cambia nunca.
function seedFields(seed: TemplateSeed): TemplateFieldInput[] {
  return seed.fields.map((field) => ({ id: randomUUID(), ...field, options: field.options.map((option) => ({ ...option })) }))
}

// Mundos, plantillas y "la biblioteca": todo lo de Escritos de la persona en una sola respuesta (sin el contenido
// de las páginas), para que el Next.js arme cada pestaña sin pedir diez cosas (decisión #38). Aquí vive también
// `refs()`, la lista de lo que existe en un mundo, con la que los demás services revisan los ids que les llegan.
@Injectable()
export class WorldsService {
  constructor(
    @Inject(WorldsRepository) private readonly worlds: WorldsRepository,
    @Inject(EntriesRepository) private readonly entries: EntriesRepository,
    @Inject(TimelineRepository) private readonly timeline: TimelineRepository,
    @Inject(StoriesRepository) private readonly stories: StoriesRepository,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  // --- La biblioteca --------------------------------------------------------------------------------------

  async library(userId: string) {
    const [worlds, templates, characters, notes, eras, stories, pages] = await Promise.all([
      this.worlds.findWorlds(userId),
      this.worlds.findTemplates(userId),
      this.entries.findCharacters(userId),
      this.entries.findNotes(userId),
      this.timeline.findEras(userId),
      this.stories.findStories(userId),
      this.stories.findPages(userId),
    ])
    const events = await this.timeline.findEvents(
      userId,
      eras.map((era) => era.id),
    )

    // Lo que vive en un mundo borrado (o en una historia borrada) no se manda, aunque sus filas sigan vivas.
    const aliveWorlds = new Set(worlds.map((world) => world.id))
    const aliveStories = new Set(stories.map((story) => story.id))

    // Las imágenes subidas: una sola llamada a Storage para firmar todas (el bucket es privado, security.md #7).
    const paths = [
      ...worlds.map((world) => world.mapPath),
      ...characters.flatMap((character) => [character.imagePath, character.coverPath]),
      ...notes.map((note) => note.coverPath),
    ].filter((path): path is string => Boolean(path))
    const urls = await this.storage.createSignedDownloadUrls(paths)

    return {
      worlds: worlds.map((world) => toWorld(world, urls)),
      templates: templates.filter((template) => aliveWorlds.has(template.worldId)).map(toTemplate),
      characters: characters.filter((character) => aliveWorlds.has(character.worldId)).map((character) => toCharacter(character, urls)),
      notes: notes.filter((note) => aliveWorlds.has(note.worldId)).map((note) => toNote(note, urls)),
      eras: eras.filter((era) => aliveWorlds.has(era.worldId)).map(publicFields),
      events: events.map(publicFields),
      stories: stories.map(publicFields),
      pages: pages.filter((page) => !page.storyId || aliveStories.has(page.storyId)).map(publicFields),
    }
  }

  // --- Mundos ----------------------------------------------------------------------------------------------

  // Un mundo nace con sus 3 plantillas de fábrica (Personaje, Especie, Lugar).
  async createWorld(userId: string, input: WorldInput) {
    const templates = DEFAULT_TEMPLATES.map((seed, position) => ({ key: seed.key, name: seed.name, color: seed.color, fields: seedFields(seed), position }))
    const row = await this.worlds.createWorld(userId, input, templates)
    return toWorld(row, new Map())
  }

  async updateWorld(userId: string, id: string, input: WorldUpdateInput) {
    const world = await this.assertWorld(userId, id)
    // Las secciones extra que se nombran en la barra o en los contadores tienen que ser de este mundo.
    const refs = [...(input.tabs ?? []), ...(input.stats ?? [])].filter((item) => item.startsWith('tpl:')).map((item) => item.slice(4))
    if (refs.length > 0) {
      const sections = new Set((await this.worlds.findTemplates(userId, world.id)).filter((template) => !template.key).map((template) => template.id))
      if (refs.some((ref) => !sections.has(ref))) throw badRequest('SECTION_NOT_FOUND', 'Esa sección no existe en este mundo.')
    }
    const row = await this.worlds.updateWorld(userId, id, input)
    if (!row) throw this.worldNotFound()
    return toWorld(row, await this.storage.createSignedDownloadUrls(row.mapPath ? [row.mapPath] : []))
  }

  async deleteWorld(userId: string, id: string) {
    const row = await this.worlds.softDeleteWorld(userId, id)
    if (!row) throw this.worldNotFound()
  }

  async restoreWorld(userId: string, id: string) {
    const row = await this.worlds.restoreWorld(userId, id)
    if (!row) throw new NotFoundException({ code: 'UNDO_EXPIRED', message: 'Ya no se puede deshacer.' })
  }

  // El mapa del mundo (pestaña Regiones, "Subir mapa"): mismo patrón en dos pasos que la portada de un proyecto.
  async signMapUpload(userId: string, id: string, input: SignCoverUploadInput) {
    await this.assertWorld(userId, id)
    assertImage(input)
    return this.storage.createSignedUploadUrl(this.storage.buildPath(userId, `writings/worlds/${id}/map`, input.name))
  }

  async confirmMapUpload(userId: string, id: string, path: string) {
    const world = await this.assertWorld(userId, id)
    // La ruta la armó la API al firmar; si no empieza así, no es de este mundo (ni de esta persona).
    if (!path.startsWith(`${userId}/writings/worlds/${id}/map/`)) throw this.worldNotFound()
    await this.storage.confirmUpload(path)
    const row = await this.worlds.setWorldMap(userId, id, path)
    if (!row) throw this.worldNotFound()
    if (world.mapPath && world.mapPath !== path) await this.storage.remove([world.mapPath])
    return toWorld(row, await this.storage.createSignedDownloadUrls([path]))
  }

  // --- Plantillas ------------------------------------------------------------------------------------------

  // "Nueva sección" (menú Más): una plantilla sin `key`, con un campo y una sección para empezar.
  async createSection(userId: string, worldId: string, name: string) {
    await this.assertWorld(userId, worldId)
    const row = await this.worlds.createTemplate(userId, worldId, { key: null, name, color: NEW_SECTION_TEMPLATE.color, fields: seedFields(NEW_SECTION_TEMPLATE) })
    return toTemplate(row)
  }

  async updateTemplate(userId: string, id: string, input: TemplateUpdateInput) {
    const template = await this.worlds.findTemplate(userId, id)
    if (!template) throw this.templateNotFound()
    if (input.fields) {
      for (const field of input.fields) {
        if (field.key && KEY_ALLOWED_IN[field.key] !== template.key) throw badRequest('FIELD_KEY_INVALID', 'Ese campo especial no va en esta plantilla.')
        // Una sección "para rellenar" siempre es texto; las opciones solo tienen sentido en una selección.
        if (field.kind === 'section' && field.type !== 'text') throw badRequest('FIELD_INVALID', 'Una sección para rellenar es de texto.')
      }
    }
    const fields = input.fields?.map((field) => ({ ...field, options: field.type === 'select' ? field.options : [] }))
    const row = await this.worlds.updateTemplate(userId, id, { ...input, fields })
    if (!row) throw this.templateNotFound()
    return toTemplate(row)
  }

  // Solo una sección extra se puede borrar: las de fábrica sostienen las pestañas fijas.
  async deleteTemplate(userId: string, id: string) {
    const template = await this.worlds.findTemplate(userId, id)
    if (!template) throw this.templateNotFound()
    if (template.key) throw badRequest('TEMPLATE_BUILT_IN', 'Esta plantilla viene con el mundo y no se puede borrar.')
    await this.worlds.softDeleteTemplate(userId, id)
  }

  async restoreTemplate(userId: string, id: string) {
    const row = await this.worlds.restoreTemplate(userId, id)
    if (!row) throw new NotFoundException({ code: 'UNDO_EXPIRED', message: 'Ya no se puede deshacer.' })
  }

  // --- Para los demás services del módulo --------------------------------------------------------------

  async assertWorld(userId: string, worldId: string): Promise<WorldRow> {
    const world = await this.worlds.findWorld(userId, worldId)
    if (!world) throw this.worldNotFound()
    return world
  }

  findTemplate(userId: string, id: string) {
    return this.worlds.findTemplate(userId, id)
  }

  // La plantilla de personajes de un mundo (cada mundo tiene exactamente una).
  async characterTemplate(userId: string, worldId: string) {
    const template = (await this.worlds.findTemplates(userId, worldId)).find((item) => item.key === 'character')
    if (!template) throw this.templateNotFound()
    return template
  }

  // Lo que existe en un mundo y se puede nombrar desde una ficha, un evento o una historia.
  async refs(userId: string, worldId: string): Promise<WorldRefs> {
    const [characters, notes, eras, templates] = await Promise.all([
      this.entries.findCharacters(userId, worldId),
      this.entries.findNotes(userId, worldId),
      this.timeline.findEras(userId, worldId),
      this.worlds.findTemplates(userId, worldId),
    ])
    return {
      worldId,
      characters: new Set(characters.map((item) => item.id)),
      notes: new Set(notes.map((item) => item.id)),
      eras: new Set(eras.map((item) => item.id)),
      sections: new Set(templates.filter((item) => !item.key).map((item) => item.id)),
    }
  }

  private worldNotFound() {
    return new NotFoundException({ code: 'WORLD_NOT_FOUND', message: 'No encontramos ese mundo.' })
  }

  private templateNotFound() {
    return new NotFoundException({ code: 'TEMPLATE_NOT_FOUND', message: 'No encontramos esa plantilla.' })
  }
}

// Una imagen de portada, foto o mapa: el mismo tipo y tope que la portada de un proyecto (decisión #44).
export function assertImage(input: SignCoverUploadInput) {
  if (classifyProjectFile(input.name) !== 'image') throw badRequest('FILE_TYPE_NOT_ALLOWED', 'Elige una imagen (PNG, JPG, WEBP o GIF).')
  if (input.sizeBytes > COVER_IMAGE_MAX_BYTES) throw badRequest('FILE_TOO_LARGE', 'La imagen pesa más de lo permitido.')
}

// --- Cómo sale cada fila hacia el front ------------------------------------------------------------------
// Las rutas de Storage nunca salen crudas: se cambian por una URL firmada que caduca (security.md #7).

const urlOf = (urls: Map<string, string>, path: string | null) => (path ? (urls.get(path) ?? null) : null)

export function toWorld(row: WorldRow, urls: Map<string, string>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    synopsis: row.synopsis,
    rules: row.rules,
    tabs: row.tabs,
    stats: row.stats,
    mapUrl: urlOf(urls, row.mapPath),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toTemplate(row: TemplateRow) {
  return publicFields(row)
}

function coverOf(row: { coverMode: string; coverColor: string | null; coverPosition: number; coverPath: string | null }, urls: Map<string, string>) {
  return { mode: row.coverMode, color: row.coverColor, position: row.coverPosition, url: urlOf(urls, row.coverPath) }
}

export function toCharacter(row: CharacterListRow & { content?: unknown }, urls: Map<string, string>) {
  const { imagePath, coverPath, coverMode, coverColor, coverPosition, ...rest } = publicFields(row)
  return { ...rest, imageUrl: urlOf(urls, imagePath), cover: coverOf({ coverMode, coverColor, coverPosition, coverPath }, urls) }
}

export function toNote(row: NoteListRow & { content?: unknown }, urls: Map<string, string>) {
  const { coverPath, coverMode, coverColor, coverPosition, ...rest } = publicFields(row)
  return { ...rest, cover: coverOf({ coverMode, coverColor, coverPosition, coverPath }, urls) }
}
