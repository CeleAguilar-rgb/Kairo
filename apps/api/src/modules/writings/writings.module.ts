import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module.js'
import { StorageModule } from '../../common/storage/storage.module.js'
import { EntriesController } from './entries.controller.js'
import { EntriesRepository } from './entries.repository.js'
import { EntriesService } from './entries.service.js'
import { StoriesController } from './stories.controller.js'
import { StoriesRepository } from './stories.repository.js'
import { StoriesService } from './stories.service.js'
import { TimelineController } from './timeline.controller.js'
import { TimelineRepository } from './timeline.repository.js'
import { TimelineService } from './timeline.service.js'
import { WorldsController } from './worlds.controller.js'
import { WorldsRepository } from './worlds.repository.js'
import { WorldsService } from './worlds.service.js'
import { WritingsTrash } from './writings.trash.js'
import { WritingsSearch } from './writings.search.js'

// Un solo módulo de Nest para Escritos (una sección de la UI, modules.md), partido en cuatro áreas con su
// controller/service/repository cada una, igual que Finanzas: mundos y plantillas, fichas (personajes y notas),
// línea del tiempo, e historias con sus páginas. WorldsService es el centro: los otros tres le preguntan si un
// mundo es de la persona y qué ids existen en él. Cuenta da la zona horaria (para "palabras de hoy") y Storage
// las fotos, portadas y mapas.
@Module({
  imports: [AccountModule, StorageModule],
  controllers: [WorldsController, EntriesController, TimelineController, StoriesController],
  providers: [WorldsService, WorldsRepository, EntriesService, EntriesRepository, TimelineService, TimelineRepository, StoriesService, StoriesRepository, WritingsTrash, WritingsSearch],
})
export class WritingsModule {}
