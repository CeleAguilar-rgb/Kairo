import { Global, Injectable, Module } from '@nestjs/common'
import type { TrashKind } from '@kairo/shared'
import type { TrashSource } from './trash.types.js'

// Donde cada módulo anota su adaptador de papelera al arrancar (`onModuleInit`). Es la dependencia "al revés": los
// módulos conocen el registro, el registro no conoce a ningún módulo, y la Papelera solo habla con el registro. Así
// agregar un módulo nuevo a la papelera no toca la Papelera, y no hay importaciones circulares.
@Injectable()
export class TrashRegistry {
  private readonly byKind = new Map<TrashKind, TrashSource>()
  private readonly sources: TrashSource[] = []

  register(source: TrashSource) {
    for (const kind of source.kinds) {
      if (this.byKind.has(kind)) throw new Error(`Dos adaptadores de papelera dicen ser de "${kind}".`)
      this.byKind.set(kind, source)
    }
    this.sources.push(source)
  }

  sourceFor(kind: TrashKind): TrashSource | undefined {
    return this.byKind.get(kind)
  }

  all(): readonly TrashSource[] {
    return this.sources
  }
}

@Global()
@Module({ providers: [TrashRegistry], exports: [TrashRegistry] })
export class TrashRegistryModule {}
