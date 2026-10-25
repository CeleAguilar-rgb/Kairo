import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module'
import { StorageModule } from '../../common/storage/storage.module'
import { EntriesController } from './entries.controller'
import { EntriesRepository } from './entries.repository'
import { EntriesService } from './entries.service'
import { StoriesController } from './stories.controller'
import { StoriesRepository } from './stories.repository'
import { StoriesService } from './stories.service'
import { TimelineController } from './timeline.controller'
import { TimelineRepository } from './timeline.repository'
import { TimelineService } from './timeline.service'
import { WorldsController } from './worlds.controller'
import { WorldsRepository } from './worlds.repository'
import { WorldsService } from './worlds.service'

// Un solo módulo de Nest para Escritos (una sección de la UI, modules.md), partido en cuatro áreas con su
// controller/service/repository cada una, igual que Finanzas: mundos y plantillas, fichas (personajes y notas),
// línea del tiempo, e historias con sus páginas. WorldsService es el centro: los otros tres le preguntan si un
// mundo es de la persona y qué ids existen en él. Cuenta da la zona horaria (para "palabras de hoy") y Storage
// las fotos, portadas y mapas.
@Module({
  imports: [AccountModule, StorageModule],
  controllers: [WorldsController, EntriesController, TimelineController, StoriesController],
  providers: [WorldsService, WorldsRepository, EntriesService, EntriesRepository, TimelineService, TimelineRepository, StoriesService, StoriesRepository],
})
export class WritingsModule {}
