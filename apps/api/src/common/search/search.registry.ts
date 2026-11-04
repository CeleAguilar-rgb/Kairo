import { Global, Injectable, Module } from '@nestjs/common'
import { SEARCH_PER_KIND, type SearchKind } from '@kairo/shared'
import { ilike, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

// Un resultado de Ctrl+K como lo reporta su módulo: hechos crudos (decisión #38). El front arma el subtítulo y a
// dónde lleva (`href`). `parentId` es lo que hace falta para la ruta: el mundo de una ficha, el de una historia.
export type SearchHit = {
  kind: SearchKind
  id: string
  title: string
  detail: string | null
  date: string | null
  amountCents: number | null
  parentId: string | null
}

// El contrato de cada módulo (`<módulo>.search.ts`): busca en SUS tablas, solo lo de la persona y lo vivo.
export interface SearchSource {
  search(userId: string, pattern: string): Promise<SearchHit[]>
}

// Mismo patrón que la Papelera (common/trash/trash.registry.ts): cada módulo se anota al arrancar y la búsqueda
// solo conoce este registro, no las tablas de nadie (regla 13).
@Injectable()
export class SearchRegistry {
  private readonly sources: SearchSource[] = []

  register(source: SearchSource) {
    this.sources.push(source)
  }

  all(): readonly SearchSource[] {
    return this.sources
  }
}

@Global()
@Module({ providers: [SearchRegistry], exports: [SearchRegistry] })
export class SearchRegistryModule {}

// El texto de la persona como patrón de ILIKE ("contiene"). `%`, `_` y `\` se escapan: si no, "100%" encontraría
// todo lo que empieza con 100. Va como parámetro de la consulta, nunca pegado al SQL.
export function containsPattern(text: string) {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

export function matches(column: PgColumn, pattern: string): SQL {
  return ilike(column, pattern)
}

export const PER_KIND = SEARCH_PER_KIND
