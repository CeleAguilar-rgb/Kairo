import type { OnModuleInit } from '@nestjs/common'
import type { SearchHit, SearchRegistry, SearchSource } from './search.registry'

// Base de los adaptadores de búsqueda (`<módulo>.search.ts`): solo se anota en el registro al arrancar.
export abstract class ModuleSearch implements SearchSource, OnModuleInit {
  protected constructor(private readonly registry: SearchRegistry) {}

  onModuleInit() {
    this.registry.register(this)
  }

  abstract search(userId: string, pattern: string): Promise<SearchHit[]>
}

// Un resultado con los campos que no usa en null.
export function hit(fields: Pick<SearchHit, 'kind' | 'id' | 'title'> & Partial<SearchHit>): SearchHit {
  return { detail: null, date: null, amountCents: null, parentId: null, ...fields }
}
