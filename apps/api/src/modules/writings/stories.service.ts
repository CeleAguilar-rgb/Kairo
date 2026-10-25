import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  emptyDoc,
  tiptapWordCount,
  type ChapterMetaInput,
  type PageCreateInput,
  type PageSaveInput,
  type StoryCreateInput,
  type StoryUpdateInput,
} from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import { StoriesRepository, type PagePatch, type StoryPatch } from './stories.repository'
import { assertIdsIn, badRequest, publicFields, todayIn } from './writings-utils'
import { WorldsService } from './worlds.service'

// Historias y cuadernos, sus páginas y las palabras escritas por día. La era, el lugar, el elenco y el punto de
// vista de un capítulo se revisan contra el mundo de la historia (una historia sin mundo no los puede tener).
@Injectable()
export class StoriesService {
  constructor(
    @Inject(StoriesRepository) private readonly repository: StoriesRepository,
    @Inject(WorldsService) private readonly worlds: WorldsService,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  // --- Historias -------------------------------------------------------------------------------------------

  async createStory(userId: string, input: StoryCreateInput) {
    if (input.worldId) await this.worlds.assertWorld(userId, input.worldId)
    const row = await this.repository.createStory(userId, {
      worldId: input.worldId,
      title: input.title,
      kind: input.kind,
      summary: input.summary,
      color: input.color,
      wordGoal: input.wordGoal,
      status: input.status ?? 'in_progress',
    })
    return publicFields(row)
  }

  async updateStory(userId: string, id: string, input: StoryUpdateInput) {
    const story = await this.repository.findStory(userId, id)
    if (!story) throw storyNotFound()
    const patch: StoryPatch = { ...input }

    const namesWorld = Boolean(input.eraId || input.placeId || input.cast?.length)
    if (namesWorld) {
      if (!story.worldId) throw badRequest('STORY_WITHOUT_WORLD', 'Esta historia no vive en ningún mundo.')
      const refs = await this.worlds.refs(userId, story.worldId)
      if (input.eraId) assertIdsIn([input.eraId], [refs.eras], 'Esa era no existe en este mundo.')
      if (input.placeId) assertIdsIn([input.placeId], [refs.notes], 'Ese lugar no existe en este mundo.')
      if (input.cast) assertIdsIn(input.cast, [refs.characters], 'Alguno de esos personajes no existe en este mundo.')
    }
    const row = await this.repository.updateStory(userId, id, patch)
    if (!row) throw storyNotFound()
    return publicFields(row)
  }

  async deleteStory(userId: string, id: string) {
    const row = await this.repository.softDeleteStory(userId, id)
    if (!row) throw storyNotFound()
  }

  async restoreStory(userId: string, id: string) {
    const row = await this.repository.restoreStory(userId, id)
    if (!row) throw undoExpired()
  }

  // --- Páginas -----------------------------------------------------------------------------------------

  // Un capítulo va en una historia y una página en un cuaderno; una nota rápida, suelta.
  async createPage(userId: string, input: PageCreateInput) {
    if (input.storyId) {
      const story = await this.repository.findStory(userId, input.storyId)
      if (!story) throw badRequest('STORY_NOT_FOUND', 'No encontramos esa historia.')
      const expected = story.kind === 'story' ? 'chapter' : 'page'
      if (input.kind !== expected) throw badRequest('PAGE_KIND_INVALID', story.kind === 'story' ? 'Una historia lleva capítulos.' : 'Un cuaderno lleva páginas.')
    }
    const row = await this.repository.createPage(userId, { storyId: input.storyId, kind: input.kind, title: input.title, content: emptyDoc() })
    return publicFields(row)
  }

  async getPage(userId: string, id: string) {
    const row = await this.repository.findPage(userId, id)
    if (!row) throw pageNotFound()
    return publicFields(row)
  }

  // Guardar mientras se escribe. Las palabras se cuentan aquí, del contenido que llegó (decisión #32), y lo que
  // se agregó se suma al día de hoy en la zona de la persona (borrar texto no resta lo ya escrito).
  async savePage(userId: string, id: string, input: PageSaveInput) {
    const page = await this.repository.findPage(userId, id)
    if (!page) throw pageNotFound()
    const wordCount = tiptapWordCount(input.content)
    const patch: PagePatch = { title: input.title, status: input.status, content: input.content, wordCount, tag: page.kind === 'note' ? input.tag || null : page.tag }
    const row = await this.repository.updatePage(userId, id, patch)
    if (!row) throw pageNotFound()
    const added = wordCount - page.wordCount
    if (added > 0) await this.repository.addWords(userId, await this.todayOf(userId), added)
    return { id: row.id, wordCount: row.wordCount, updatedAt: row.updatedAt }
  }

  // Arco, era y punto de vista de un capítulo.
  async setChapterMeta(userId: string, id: string, input: ChapterMetaInput) {
    const page = await this.repository.findPage(userId, id)
    if (!page) throw pageNotFound()
    const story = page.storyId ? await this.repository.findStory(userId, page.storyId) : undefined
    if (page.kind !== 'chapter' || !story) throw badRequest('PAGE_NOT_CHAPTER', 'Esto solo se elige en un capítulo.')

    if (input.arcId && !story.arcs.some((arc) => arc.id === input.arcId)) throw badRequest('ARC_NOT_FOUND', 'Ese arco no existe en esta historia.')
    if (input.eraId || input.povCharacterId) {
      if (!story.worldId) throw badRequest('STORY_WITHOUT_WORLD', 'Esta historia no vive en ningún mundo.')
      const refs = await this.worlds.refs(userId, story.worldId)
      if (input.eraId) assertIdsIn([input.eraId], [refs.eras], 'Esa era no existe en este mundo.')
      if (input.povCharacterId) assertIdsIn([input.povCharacterId], [refs.characters], 'Ese personaje no existe en este mundo.')
    }
    const row = await this.repository.updatePage(userId, id, input)
    if (!row) throw pageNotFound()
    return publicFields(row)
  }

  async deletePage(userId: string, id: string) {
    const row = await this.repository.softDeletePage(userId, id)
    if (!row) throw pageNotFound()
  }

  async restorePage(userId: string, id: string) {
    const row = await this.repository.restorePage(userId, id)
    if (!row) throw undoExpired()
  }

  // --- Palabras por día ------------------------------------------------------------------------------------

  listWritingDays(userId: string, from: string) {
    return this.repository.findWritingDays(userId, from)
  }

  private async todayOf(userId: string): Promise<string> {
    const { profile } = await this.accountService.getMe(userId)
    return todayIn(profile.timezone)
  }
}

function storyNotFound() {
  return new NotFoundException({ code: 'STORY_NOT_FOUND', message: 'No encontramos esa historia.' })
}

function pageNotFound() {
  return new NotFoundException({ code: 'PAGE_NOT_FOUND', message: 'No encontramos esa página.' })
}

function undoExpired() {
  return new NotFoundException({ code: 'UNDO_EXPIRED', message: 'Ya no se puede deshacer.' })
}
