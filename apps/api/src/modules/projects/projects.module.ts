import { Module } from '@nestjs/common'
import { StorageModule } from '../../common/storage/storage.module.js'
import { ProjectsController } from './projects.controller.js'
import { ProjectsRepository } from './projects.repository.js'
import { ProjectsService } from './projects.service.js'
import { ProjectsTrash } from './projects.trash.js'
import { ProjectsSearch } from './projects.search.js'

// Tareas, Agenda, Metas y Sprints le piden a ProjectsService el nombre de un proyecto y si es de la persona
// (modules.md: un módulo pide datos al service de otro, nunca lee su tabla). Este módulo no depende de ninguno
// de ellos: así no hay dependencias circulares. StorageModule es para la portada subida (decisión #44): resolver
// su URL firmada al leer un proyecto, y firmar/confirmar su subida.
@Module({
  imports: [StorageModule],
  controllers: [ProjectsController],
  // ProjectsTrash: su adaptador de papelera (se anota solo en el TrashRegistry al arrancar).
  providers: [ProjectsService, ProjectsRepository, ProjectsTrash, ProjectsSearch],
  exports: [ProjectsService],
})
export class ProjectsModule {}
