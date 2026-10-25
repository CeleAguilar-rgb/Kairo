import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { CharacterUpdateInput, CoverInput, NoteCreateInput, NoteUpdateInput, SignCoverUploadInput } from '@kairo/shared'
import { StorageService } from '../../common/storage/storage.service'
import { EntriesRepository, type CharacterRow, type EntryPatch, type NoteRow } from './entries.repository'
import { assertIdsIn, badRequest, mergeValues } from './writings-utils'
import { assertImage, toCharacter, toNote, WorldsService } from './worlds.service'

type Kind = 'characters' | 'notes'

// Personajes y notas del mundo: la ficha (sus valores revisados contra su plantilla), su página completa y su
// portada o foto. Lo que se nombra desde una ficha (vínculos, eras, secciones, el lugar "padre") se revisa contra
// lo que existe en el mismo mundo con WorldsService.refs().
@Injectable()
export class EntriesService {
  constructor(
    @Inject(EntriesRepository) private readonly repository: EntriesRepository,
    @Inject(WorldsService) private readonly worlds: WorldsService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  // --- Personajes -----------------------------------------------------------------------------------------

  async createCharacter(userId: string, worldId: string, name: string) {
    await this.worlds.assertWorld(userId, worldId)
    const row = await this.repository.createCharacter(userId, worldId, name, {})
    return toCharacter(row, new Map())
  }

  async getCharacter(userId: string, id: string) {
    const row = await this.repository.findCharacter(userId, id)
    if (!row) throw notFound('characters')
    return this.characterOut(row)
  }

  async updateCharacter(userId: string, id: string, input: CharacterUpdateInput) {
    const current = await this.repository.findCharacter(userId, id)
    if (!current) throw notFound('characters')
    const patch: EntryPatch & { sections?: string[] } = { name: input.name, summary: input.summary, draft: input.draft, extras: input.extras, url: input.url, content: input.content, ...coverPatch(input.cover, current.coverPath) }

    if (input.values || input.sections) {
      const refs = await this.worlds.refs(userId, current.worldId)
      if (input.values) {
        const template = await this.worlds.characterTemplate(userId, current.worldId)
        patch.values = mergeValues(current.values, input.values, template.fields, refs, current.id)
      }
      if (input.sections) {
        assertIdsIn(input.sections, [refs.sections], 'Esa sección no existe en este mundo.')
        patch.sections = input.sections
      }
    }
    const row = await this.repository.updateCharacter(userId, id, patch)
    if (!row) throw notFound('characters')
    return this.characterOut(row)
  }

  async deleteCharacter(userId: string, id: string) {
    const row = await this.repository.softDeleteCharacter(userId, id)
    if (!row) throw notFound('characters')
  }

  // "Deshacer": solo si el personaje está en la papelera y su mundo sigue vivo.
  async restoreCharacter(userId: string, id: string) {
    const deleted = await this.repository.findDeletedCharacter(userId, id)
    if (!deleted?.deletedAt) throw undoExpired()
    await this.worlds.assertWorld(userId, deleted.worldId)
    await this.repository.restoreCharacter(userId, id)
  }

  // La foto (EscritosPersonaje): dos pasos, igual que la portada de un proyecto (decisión #44).
  async signCharacterImage(userId: string, id: string, input: SignCoverUploadInput) {
    if (!(await this.repository.findCharacter(userId, id))) throw notFound('characters')
    assertImage(input)
    return this.storage.createSignedUploadUrl(this.storage.buildPath(userId, `writings/characters/${id}/image`, input.name))
  }

  async confirmCharacterImage(userId: string, id: string, path: string) {
    const current = await this.repository.findCharacter(userId, id)
    if (!current || !path.startsWith(`${userId}/writings/characters/${id}/image/`)) throw notFound('characters')
    await this.storage.confirmUpload(path)
    const row = await this.repository.updateCharacter(userId, id, { imagePath: path })
    if (!row) throw notFound('characters')
    if (current.imagePath && current.imagePath !== path) await this.storage.remove([current.imagePath])
    return this.characterOut(row)
  }

  async removeCharacterImage(userId: string, id: string) {
    const current = await this.repository.findCharacter(userId, id)
    if (!current) throw notFound('characters')
    const row = await this.repository.updateCharacter(userId, id, { imagePath: null })
    if (current.imagePath) await this.storage.remove([current.imagePath])
    return this.characterOut(row ?? current)
  }

  async signCharacterCover(userId: string, id: string, input: SignCoverUploadInput) {
    if (!(await this.repository.findCharacter(userId, id))) throw notFound('characters')
    assertImage(input)
    return this.storage.createSignedUploadUrl(this.storage.buildPath(userId, `writings/characters/${id}/cover`, input.name))
  }

  // Subir una portada la pone en modo "imagen" en el centro, y borra de Storage la que hubiera antes.
  async confirmCharacterCover(userId: string, id: string, path: string) {
    const current = await this.repository.findCharacter(userId, id)
    if (!current || !path.startsWith(`${userId}/writings/characters/${id}/cover/`)) throw notFound('characters')
    await this.storage.confirmUpload(path)
    const row = await this.repository.updateCharacter(userId, id, { coverPath: path, coverMode: 'image', coverPosition: 1 })
    if (!row) throw notFound('characters')
    if (current.coverPath && current.coverPath !== path) await this.storage.remove([current.coverPath])
    return this.characterOut(row)
  }

  // --- Notas del mundo ---------------------------------------------------------------------------------------

  async createNote(userId: string, worldId: string, input: NoteCreateInput) {
    await this.worlds.assertWorld(userId, worldId)
    const template = await this.worlds.findTemplate(userId, input.templateId)
    // Una plantilla de otro mundo cuenta como inexistente; la de personajes no hace notas (tienen tabla propia).
    if (!template || template.worldId !== worldId || template.key === 'character') throw badRequest('TEMPLATE_NOT_FOUND', 'Esa plantilla no existe en este mundo.')
    if (input.parentId) await this.assertParent(userId, worldId, null, input.parentId)
    const row = await this.repository.createNote(userId, { worldId, templateId: template.id, parentId: input.parentId, name: input.name, values: {} })
    return toNote(row, new Map())
  }

  async getNote(userId: string, id: string) {
    const row = await this.repository.findNote(userId, id)
    if (!row) throw notFound('notes')
    return this.noteOut(row)
  }

  async updateNote(userId: string, id: string, input: NoteUpdateInput) {
    const current = await this.repository.findNote(userId, id)
    if (!current) throw notFound('notes')
    const patch: EntryPatch & { parentId?: string | null } = { name: input.name, summary: input.summary, draft: input.draft, extras: input.extras, url: input.url, content: input.content, ...coverPatch(input.cover, current.coverPath) }

    if (input.values) {
      const template = await this.worlds.findTemplate(userId, current.templateId)
      if (!template) throw notFound('notes')
      const refs = await this.worlds.refs(userId, current.worldId)
      patch.values = mergeValues(current.values, input.values, template.fields, refs, current.id)
    }
    if (input.parentId !== undefined) {
      if (input.parentId) await this.assertParent(userId, current.worldId, current.id, input.parentId)
      patch.parentId = input.parentId
    }
    const row = await this.repository.updateNote(userId, id, patch)
    if (!row) throw notFound('notes')
    return this.noteOut(row)
  }

  // Una nota se va con los lugares que tiene dentro (y los de adentro de esos): si no, quedarían "colgados" de un
  // lugar en la papelera.
  async deleteNote(userId: string, id: string) {
    const current = await this.repository.findNote(userId, id)
    if (!current) throw notFound('notes')
    const notes = await this.repository.findNotes(userId, current.worldId)
    const ids = [current.id]
    for (let index = 0; index < ids.length; index += 1) {
      for (const note of notes) if (note.parentId === ids[index] && !ids.includes(note.id)) ids.push(note.id)
    }
    await this.repository.softDeleteNotes(userId, ids)
  }

  async restoreNote(userId: string, id: string) {
    const row = await this.repository.restoreNote(userId, id)
    if (!row) throw undoExpired()
  }

  async signNoteCover(userId: string, id: string, input: SignCoverUploadInput) {
    if (!(await this.repository.findNote(userId, id))) throw notFound('notes')
    assertImage(input)
    return this.storage.createSignedUploadUrl(this.storage.buildPath(userId, `writings/notes/${id}/cover`, input.name))
  }

  async confirmNoteCover(userId: string, id: string, path: string) {
    const current = await this.repository.findNote(userId, id)
    if (!current || !path.startsWith(`${userId}/writings/notes/${id}/cover/`)) throw notFound('notes')
    await this.storage.confirmUpload(path)
    const row = await this.repository.updateNote(userId, id, { coverPath: path, coverMode: 'image', coverPosition: 1 })
    if (!row) throw notFound('notes')
    if (current.coverPath && current.coverPath !== path) await this.storage.remove([current.coverPath])
    return this.noteOut(row)
  }

  // --- Ayudas ----------------------------------------------------------------------------------------------

  // El "padre" de un lugar: un lugar del mismo mundo, que no sea él mismo ni uno de los que tiene dentro (si no,
  // se haría un círculo: Sudria dentro de El castillo dentro de Sudria).
  private async assertParent(userId: string, worldId: string, selfId: string | null, parentId: string) {
    const notes = await this.repository.findNotes(userId, worldId)
    const byId = new Map(notes.map((note) => [note.id, note]))
    if (!byId.has(parentId)) throw badRequest('PARENT_NOT_FOUND', 'Ese lugar no existe en este mundo.')
    let cursor: string | null = parentId
    for (let steps = 0; cursor && steps < 100; steps += 1) {
      if (cursor === selfId) throw badRequest('PARENT_CYCLE', 'Un lugar no puede quedar dentro de sí mismo.')
      cursor = byId.get(cursor)?.parentId ?? null
    }
  }

  private async characterOut(row: CharacterRow) {
    const paths = [row.imagePath, row.coverPath].filter((path): path is string => Boolean(path))
    return toCharacter(row, await this.storage.createSignedDownloadUrls(paths))
  }

  private async noteOut(row: NoteRow) {
    return toNote(row, await this.storage.createSignedDownloadUrls(row.coverPath ? [row.coverPath] : []))
  }
}

// La portada que llega del panel: modo, color y posición. "Imagen" solo si ya hay una subida (se sube aparte).
function coverPatch(cover: CoverInput | undefined, currentPath: string | null): Partial<EntryPatch> {
  if (!cover) return {}
  if (cover.mode === 'image' && !currentPath) throw badRequest('COVER_IMAGE_MISSING', 'Primero sube una imagen.')
  return { coverMode: cover.mode, coverColor: cover.mode === 'color' ? cover.color : null, coverPosition: cover.position }
}

function notFound(kind: Kind) {
  return kind === 'characters'
    ? new NotFoundException({ code: 'CHARACTER_NOT_FOUND', message: 'No encontramos ese personaje.' })
    : new NotFoundException({ code: 'NOTE_NOT_FOUND', message: 'No encontramos esa nota.' })
}

function undoExpired() {
  return new NotFoundException({ code: 'UNDO_EXPIRED', message: 'Ya no se puede deshacer.' })
}
