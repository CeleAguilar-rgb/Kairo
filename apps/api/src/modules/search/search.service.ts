import { Inject, Injectable } from '@nestjs/common'
import { SEARCH_KINDS } from '@kairo/shared'
import { containsPattern, type SearchHit, SearchRegistry } from '../../common/search/search.registry'

@Injectable()
export class SearchService {
  constructor(@Inject(SearchRegistry) private readonly registry: SearchRegistry) {}

  // Pregunta a todos los módulos a la vez y ordena por tipo (el orden de SEARCH_KINDS: tareas primero, como en el
  // canvas), luego por título.
  async search(userId: string, q: string): Promise<SearchHit[]> {
    const pattern = containsPattern(q)
    const lists = await Promise.all(this.registry.all().map((source) => source.search(userId, pattern)))
    const order = (hit: SearchHit) => SEARCH_KINDS.indexOf(hit.kind)
    return lists.flat().sort((a, b) => order(a) - order(b) || a.title.localeCompare(b.title, 'es'))
  }
}
